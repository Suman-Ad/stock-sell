import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../firebase";

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    getDocs
} from "firebase/firestore";

import useUserRole from "../hooks/useUserRole";

import { QRCodeCanvas } from "qrcode.react";

import "../assets/SalesHistory.css";
import FeatureGate from "../components/FeatureGate";
import { useNavigate } from "react-router-dom";
import { type } from "firebase/firestore/pipelines";

const SalesHistory = ({ user }) => {

    const [sales, setSales] = useState([]);
    const [filterDate, setFilterDate] = useState("");
    const [search, setSearch] = useState("");

    const role = useUserRole();
    const [hoveredQR, setHoveredQR] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 25;

    // =========================================
    // LOAD SALES
    // =========================================
    useEffect(() => {

        if (!auth.currentUser || !role) return;

        let q;

        if (role === "admin" || role === "superadmin") {

            q = query(
                collection(db, "sales"),
                where("deleted", "!=", true)
                // where("deleted", "in", [false, null])
            );

        } else {

            q = query(
                collection(db, "sales"),
                where("userId", "==", auth.currentUser.uid),
                where("deleted", "!=", true)
                // where("deleted", "in", [false, null])
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {

            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSales(data);

        });

        return () => unsubscribe();

    }, [role]);

    // =========================================
    // FILTER
    // =========================================
    // =========================================
    // FILTER STATES
    // =========================================
    const [statusFilter, setStatusFilter] = useState("");
    const [platformFilter, setPlatformFilter] = useState("");
    const [saleTypeFilter, setSaleTypeFilter] = useState("");
    const [profitFilter, setProfitFilter] = useState("");
    const [sizeFilter, setSizeFilter] = useState("");

    // =========================================
    // FILTER
    // =========================================
    // =========================================
    // NORMALIZE VALUE
    // =========================================
    const normalize = (value) => {
        return String(value || "")
            .trim()
            .toLowerCase();
    };

    // =========================================
    // FILTER
    // =========================================
    const filteredSales = useMemo(() => {
        return sales.filter((s) => {

            // =========================
            // NORMALIZED VALUES
            // =========================
            const orderStatus =
                normalize(s.orderStatus);

            const platform =
                normalize(s.platform);

            const size =
                normalize(s.size);

            const catalogId =
                normalize(s.catalogId);

            const productName =
                normalize(s.productName);

            const orderId =
                normalize(s.orderId);

            const customerName =
                normalize(s.customer?.name);

            const customerPhone =
                normalize(s.customer?.phone);

            const customerEmail =
                normalize(s.customer?.email);

            const awbNo =
                normalize(s.customer?.awbNo);

            const keyword =
                normalize(search);

            // =========================
            // DATE FILTER
            // =========================
            if (filterDate) {

                let saleDateObj = null;

                if (s.soldAt?.toDate) {

                    saleDateObj = s.soldAt.toDate();

                } else if (s.soldAt instanceof Date) {

                    saleDateObj = s.soldAt;

                } else if (s.soldAt) {

                    saleDateObj = new Date(s.soldAt);
                }

                if (
                    !saleDateObj ||
                    isNaN(saleDateObj.getTime())
                ) {
                    return false;
                }

                const yyyy =
                    saleDateObj.getFullYear();

                const mm = String(
                    saleDateObj.getMonth() + 1
                ).padStart(2, "0");

                const dd = String(
                    saleDateObj.getDate()
                ).padStart(2, "0");

                const saleDate =
                    `${yyyy}-${mm}-${dd}`;

                if (saleDate !== filterDate) {
                    return false;
                }
            }

            // =========================
            // STATUS FILTER
            // =========================
            if (
                statusFilter &&
                !orderStatus.includes(
                    normalize(statusFilter)
                )
            ) {
                return false;
            }

            // =========================
            // PLATFORM FILTER
            // =========================
            if (
                platformFilter &&
                !platform.includes(
                    normalize(platformFilter)
                )
            ) {
                return false;
            }

            // =========================
            // SIZE FILTER
            // =========================
            if (
                sizeFilter &&
                !size.includes(
                    normalize(sizeFilter)
                )
            ) {
                return false;
            }

            // =========================
            // ONLINE / OFFLINE FILTER
            // =========================
            if (saleTypeFilter) {

                const isOnline =
                    s.isSaleOnline === true ||
                    normalize(s.isSaleOnline) === "true" ||
                    normalize(s.isSaleOnline) === "online";

                if (
                    saleTypeFilter === "online" &&
                    !isOnline
                ) {
                    return false;
                }

                if (
                    saleTypeFilter === "offline" &&
                    isOnline
                ) {
                    return false;
                }
            }

            // =========================
            // PROFIT / LOSS FILTER
            // =========================
            if (profitFilter) {

                const profit =
                    Number(s.profit || 0);

                if (
                    profitFilter === "profit" &&
                    profit <= 0
                ) {
                    return false;
                }

                if (
                    profitFilter === "loss" &&
                    profit >= 0
                ) {
                    return false;
                }
            }

            // =========================
            // SEARCH
            // =========================
            if (keyword) {

                const searchValues = [
                    catalogId,
                    productName,
                    orderId,
                    platform,
                    orderStatus,
                    size,
                    customerName,
                    customerPhone,
                    customerEmail,
                    awbNo
                ];

                const found =
                    searchValues.some(v =>
                        v.includes(keyword)
                    );

                if (!found) {
                    return false;
                }
            }

            return true;
        });
    }, [
        sales,
        search,
        filterDate,
        statusFilter,
        platformFilter,
        saleTypeFilter,
        profitFilter,
        sizeFilter
    ]);

    // =========================================
    // FILTERED SALES
    // =========================================
    const activeSales = filteredSales;

    // =========================================
    // PAGINATION
    // =========================================
    const totalPages = Math.max(
        1,
        Math.ceil(
            activeSales.length / ITEMS_PER_PAGE
        )
    );

    // FIX INVALID PAGE
    const safeCurrentPage = Math.min(
        currentPage,
        totalPages
    );

    const startIndex =
        (safeCurrentPage - 1) * ITEMS_PER_PAGE;

    const paginatedSales =
        activeSales.slice(
            startIndex,
            startIndex + ITEMS_PER_PAGE
        );

    const totalSales = activeSales.length;

    const totalRevenue = activeSales.reduce(
        (sum, s) =>
            sum + Number(s.sellingPrice || 0),
        0
    );

    const totalProfit = activeSales.reduce(
        (sum, s) =>
            sum + Number(s.profit || 0),
        0
    );

    // =========================================
    // DELETE SALE
    // =========================================
    const handleDelete = async (sale) => {

        if (!window.confirm("Delete this sale?")) return;

        setDeletingId(sale.id);

        try {

            // ====================================
            // RESTORE QR STATUS
            // ====================================

            if (sale.uniqueId) {

                const qrQuery = query(
                    collection(db, "qrcodes"),
                    where("uniqueId", "==", sale.uniqueId)
                );

                const qrSnap = await getDocs(qrQuery);

                if (!qrSnap.empty) {

                    const qrDoc = qrSnap.docs[0];

                    await updateDoc(
                        doc(db, "qrcodes", qrDoc.id),
                        {
                            status: "available",
                            soldAt: null
                        }
                    );
                }
            }

            // ====================================
            // RESTORE STOCK
            // ====================================

            if (sale.stockId && sale.size) {

                const stockRef = doc(
                    db,
                    "stocks",
                    sale.stockId
                );

                const stockSnap = await getDoc(stockRef);

                if (stockSnap.exists()) {

                    const stockData = stockSnap.data();

                    const sizes = {
                        ...stockData.sizes
                    };

                    if (sizes[sale.size]) {

                        sizes[sale.size].qty =
                            Number(sizes[sale.size].qty || 0) + 1;

                        await updateDoc(stockRef, {
                            sizes
                        });
                    }
                }
            }

            // ====================================
            // SOFT DELETE SALE
            // ====================================

            const saleDocId =
                sale.uniqueId ||
                sale.orderId ||
                sale.id;

            const saleRef =
                doc(db, "sales", saleDocId);

            const saleSnap = await getDoc(saleRef);

            if (saleSnap.exists()) {

                await updateDoc(saleRef, {
                    deleted: true,
                    soldAt: null,
                    deletedAt: new Date()
                });

            }

            // ====================================
            // REMOVE FROM UI
            // ====================================

            setSales(prev =>
                prev.filter(item => item.id !== sale.id)
            );

            alert("✅ Sale deleted successfully");

        } catch (error) {

            console.error("DELETE ERROR:", error);

            alert(error.message);

        } finally {

            setDeletingId(null);
        }
    };

    useEffect(() => {

        const maxPage = Math.max(
            1,
            Math.ceil(
                filteredSales.length /
                ITEMS_PER_PAGE
            )
        );

        if (currentPage > maxPage) {
            setCurrentPage(maxPage);
        }

    }, [
        filteredSales.length,
        currentPage
    ]);

    return (

        <div className="sales-page">
            <FeatureGate
                user={user}
                feature="salesHistory"
                title="Sales History"
                description="Upgrade your plan to unlock Sales History."
            >

                <h2 className="page-title">
                    🧾 Sales History
                </h2>

                {/* SUMMARY */}
                <div className="sales-summary">

                    <div className="summary-card">
                        <span>Total Orders</span>
                        <h2>{totalSales}</h2>
                    </div>

                    <div className="summary-card">
                        <span>Total Revenue</span>
                        <h2>
                            ₹{totalRevenue.toFixed(2)}
                        </h2>
                    </div>

                    <div className={`summary-card ${totalProfit < 0 ? "loss" : "profit"}`}>
                        <span>Total Profit</span>

                        <h2>
                            ₹{totalProfit.toFixed(2)}
                        </h2>
                    </div>

                </div>

                <FeatureGate
                    user={user}
                    feature="marketplaceIntegrations"
                    title="Marketplace Integrations"
                    description="Upgrade your plan to unlock Marketplace Integrations."
                >
                    {/* <button className="summary-card" style={{ color: "white" }} onClick={() => navigate("/marketplace-integrations")} >
                        Marketplace Integrations
                    </button> */}

                    <button className="summary-card" style={{ color: "white" }}
                        onClick={() =>
                            navigate("/marketplace-csv-import",
                                {
                                    state: {
                                        type: "orders"
                                    }
                                })} >
                        Marketplace Order(Pendig/Shipment/Deliverd) CSV Import
                    </button>
                </FeatureGate>

                {/* FILTER */}
                {/* FILTER */}
                <div className="sales-filter">

                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) =>
                            setFilterDate(e.target.value)
                        }
                    />

                    <input
                        type="text"
                        placeholder="Search anything..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                    {/* STATUS */}
                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value)
                        }
                    >
                        <option value="">
                            All Status
                        </option>

                        <option value="pending">
                            Pending
                        </option>

                        <option value="shipped">
                            Shipped
                        </option>

                        <option value="delivered">
                            Delivered
                        </option>

                        <option value="cancelled">
                            Cancelled
                        </option>

                        <option value="returned">
                            Returned
                        </option>

                        <option value="rto">
                            RTO
                        </option>
                    </select>

                    {/* PLATFORM */}
                    <select
                        value={platformFilter}
                        onChange={(e) =>
                            setPlatformFilter(e.target.value)
                        }
                    >
                        <option value="">
                            All Platform
                        </option>

                        <option value="meesho">
                            Meesho
                        </option>

                        <option value="flipkart">
                            Flipkart
                        </option>

                        <option value="amazon">
                            Amazon
                        </option>

                        <option value="offline">
                            Offline
                        </option>
                    </select>

                    {/* ONLINE/OFFLINE */}
                    <select
                        value={saleTypeFilter}
                        onChange={(e) =>
                            setSaleTypeFilter(e.target.value)
                        }
                    >
                        <option value="">
                            All Sales
                        </option>

                        <option value="online">
                            Online
                        </option>

                        <option value="offline">
                            Offline
                        </option>
                    </select>

                    {/* PROFIT/LOSS */}
                    <select
                        value={profitFilter}
                        onChange={(e) =>
                            setProfitFilter(e.target.value)
                        }
                    >
                        <option value="">
                            Profit + Loss
                        </option>

                        <option value="profit">
                            Only Profit
                        </option>

                        <option value="loss">
                            Only Loss
                        </option>
                    </select>

                    {/* SIZE */}
                    <input
                        type="text"
                        placeholder="Size"
                        value={sizeFilter}
                        onChange={(e) =>
                            setSizeFilter(e.target.value)
                        }
                    />

                    {/* RESET */}
                    <button
                        onClick={() => {
                            setFilterDate("");
                            setSearch("");
                            setStatusFilter("");
                            setPlatformFilter("");
                            setSaleTypeFilter("");
                            setProfitFilter("");
                            setSizeFilter("");
                        }}
                    >
                        Reset
                    </button>

                </div>

                {/* TABLE */}
                <div className="table-wrapper">

                    <table className="sales-table">

                        <thead>

                            <tr>

                                <th>QR</th>

                                <th>Date</th>

                                <th>Order Status</th>

                                <th>Catalog ID</th>

                                <th>Product</th>

                                <th>Size</th>

                                <th>Price</th>

                                <th>Profit</th>

                                <th>Customer Details</th>

                                <th>Action</th>

                            </tr>

                        </thead>

                        <tbody>

                            {paginatedSales.map((s) => (

                                <tr key={s.id}>
                                    {/* QR */}
                                    <td>
                                        <div
                                            className="qr-preview"
                                            onMouseEnter={() => setHoveredQR(s.id)}
                                            onMouseLeave={() => setHoveredQR(null)}
                                        >
                                            <QRCodeCanvas
                                                value={JSON.stringify({
                                                    id: s.stockId,
                                                    orderId: s.orderId || "",
                                                    productName: s.productName || "",
                                                    catalogId: s.catalogId || "",
                                                    size: s.size || "",
                                                    sellingPrice: s.sellingPrice || 0,
                                                    soldAt: s.soldAt || "",
                                                    status: s.status || "",
                                                    isSellOnline: s.isSaleOnline || "",
                                                    platform: s.platform || "",
                                                })}
                                                size={80}
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                                level="H"
                                                includeMargin={true}
                                            />
                                        </div>
                                    </td>

                                    {/* DATE */}
                                    <td>
                                        {(() => {

                                            let date = null;

                                            if (s.soldAt?.toDate) {

                                                date = s.soldAt.toDate();

                                            } else if (s.soldAt instanceof Date) {

                                                date = s.soldAt;

                                            } else if (s.soldAt) {

                                                date = new Date(s.soldAt);
                                            }

                                            return date && !isNaN(date)
                                                ? date.toLocaleString()
                                                : "N/A";

                                        })()}
                                    </td>

                                    {/* ORDER STATUS */}
                                    <td>
                                        <strong
                                            style={{
                                                color: {
                                                    pending: "orange",
                                                    shipped: "blue",
                                                    cancelled: "red",
                                                    delivered: "green",
                                                    returned: "#ff4d6d",
                                                    rto: "#a855f7"
                                                }[
                                                    (s.orderStatus || "")
                                                        .toLowerCase()
                                                ] || "yellow",

                                                fontWeight: "bold",
                                                textTransform: "capitalize"
                                            }}
                                        >
                                            {s.orderStatus || "Unknown"}
                                        </strong>
                                    </td>

                                    {/* CATALOG ID */}
                                    <td>
                                        {s.catalogId}
                                    </td>

                                    {/* PRODUCT */}
                                    <td>
                                        {s.productName}
                                    </td>

                                    {/* SIZE */}
                                    <td>
                                        {s.size}
                                    </td>

                                    {/* PRICE */}
                                    <td>
                                        ₹{s.sellingPrice}
                                    </td>

                                    {/* PROFIT */}
                                    <td
                                        className={
                                            s.profit < 0
                                                ? "loss"
                                                : "profit"
                                        }
                                    >
                                        ₹{Number(s.profit || 0).toFixed(2)}
                                    </td>

                                    {/* CUSTOMER */}
                                    <td>

                                        <div className="customer-box">

                                            <p>
                                                <b>
                                                    {s.customer?.awbNo || "N/A"}
                                                </b>
                                            </p>

                                            <p>
                                                <b>
                                                    {s.customer?.name || "N/A"}
                                                </b>
                                            </p>

                                            <p>
                                                📞 {s.customer?.phone || "-"}
                                            </p>

                                            {s.customer?.email && (
                                                <p>
                                                    📧 {s.customer.email}
                                                </p>
                                            )}

                                            {s.customer?.address && (
                                                <p>
                                                    📍 {s.customer.address}
                                                </p>
                                            )}

                                        </div>

                                    </td>

                                    {/* ACTION */}
                                    <td>

                                        {(role === "admin" ||
                                            s.userId === auth.currentUser.uid) && (

                                                <button
                                                    className="btn-delete"
                                                    disabled={deletingId === s.id}
                                                    onClick={() =>
                                                        handleDelete(s)
                                                    }
                                                >

                                                    {deletingId === s.id
                                                        ? "Deleting..."
                                                        : "Delete"}

                                                </button>
                                            )}

                                    </td>

                                </tr>


                            ))}

                        </tbody>

                    </table>

                </div>

                {/* PAGINATION */}
                <div className="pagination">

                    <button
                        disabled={safeCurrentPage === 1}
                        onClick={() =>
                            setCurrentPage(prev =>
                                Math.max(1, prev - 1)
                            )
                        }
                    >
                        Prev
                    </button>

                    <span>
                        Page {safeCurrentPage} of {totalPages || 1}
                    </span>

                    <button
                        disabled={
                            safeCurrentPage >= totalPages
                        }
                        onClick={() =>
                            setCurrentPage(prev =>
                                Math.min(totalPages, prev + 1)
                            )
                        }
                    >
                        Next
                    </button>

                </div>
                {paginatedSales.map((s) => (
                    <div>
                        {/* LARGE PREVIEW */}
                        {hoveredQR === s.id && (

                            <div className="qr-popup">

                                <QRCodeCanvas
                                    value={JSON.stringify({
                                        id: s.stockId,
                                        orderId: s.orderId || "",
                                        productName: s.productName || "",
                                        catalogId: s.catalogId || "",
                                        size: s.size || "",
                                        sellingPrice: s.sellingPrice || 0,
                                        soldAt: s.soldAt || "",
                                        status: s.status || "",
                                        isSellOnline: s.isSaleOnline || "",
                                        platform: s.platform || "",
                                    })}
                                    size={300}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="H"
                                    includeMargin={true}
                                />

                                <div className="qr-popup-info">

                                    <h4>{s.productName}</h4>

                                    <p>Size: {s.size}</p>

                                    <p>₹{s.sellingPrice}</p>

                                    <p>
                                        Customer:
                                        {" "}
                                        {s.customer?.name || "N/A"}
                                    </p>

                                </div>

                            </div>
                        )}
                    </div>
                ))}
            </FeatureGate>
        </div>
    );
};

export default SalesHistory;