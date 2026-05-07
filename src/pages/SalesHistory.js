// import React, { useEffect, useState } from "react";
// import { db, auth } from "../firebase";
// import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
// import useUserRole from "../hooks/useUserRole";
// import { QRCodeCanvas } from "qrcode.react";
// import "../assets/SalesHistory.css";

// const SalesHistory = ({ user }) => {
//     const [sales, setSales] = useState([]);
//     const [filterDate, setFilterDate] = useState("");
//     const role = useUserRole();
//     const [deletingId, setDeletingId] = useState(null);
//     useEffect(() => {
//         if (!auth.currentUser || !role) return;

//         let q;

//         if (role === "admin") {
//             q = collection(db, "sales");
//         } else {
//             q = query(
//                 collection(db, "sales"),
//                 where("userId", "==", auth.currentUser.uid)
//             );
//         }

//         const unsubscribe = onSnapshot(q, (snapshot) => {
//             const data = snapshot.docs
//                 .map(doc => ({ id: doc.id, ...doc.data() }))
//                 .filter(s => !s.deleted);
//             setSales(data);
//         });

//         return () => unsubscribe();
//     }, [role]);

//     const totalSales = sales.length;

//     const totalRevenue = sales.reduce(
//         (sum, s) => sum + (s.sellingPrice || 0),
//         0
//     );

//     const totalProfit = sales.reduce(
//         (sum, s) => sum + (s.profit || 0),
//         0
//     );

//     const filteredSales = sales.filter(s => {
//         if (!filterDate) return true;

//         let saleDate;

//         if (s.soldAt?.toDate) {
//             saleDate = s.soldAt.toDate().toISOString().split("T")[0];
//         } else {
//             saleDate = new Date(s.soldAt).toISOString().split("T")[0];
//         }

//         return saleDate === filterDate;
//     });

//     const handleDelete = async (sale) => {
//         if (!window.confirm("Are you sure?")) return;

//         setDeletingId(sale.id);

//         try {
//             // 🔥 Restore QR
//             if (sale.qrId) {
//                 await updateDoc(doc(db, "qrcodes", sale.qrId), {
//                     status: "available"
//                 });
//             }

//             // 🔥 Delete sale
//             await deleteDoc(doc(db, "sales", sale.id));

//         } catch (error) {
//             console.error(error);
//         }

//         setDeletingId(null);
//     };

//     return (
//         <div className="sales-page">

//             <h2 className="page-title">🧾 Sales History</h2>

//             {/* SUMMARY */}
//             <div className="sales-summary">

//                 <div className="summary-card">
//                     <span>Total Orders</span>
//                     <h2>{totalSales}</h2>
//                 </div>

//                 <div className="summary-card">
//                     <span>Total Revenue</span>
//                     <h2>₹{totalRevenue.toFixed(2)}</h2>
//                 </div>

//                 <div className={`summary-card ${totalProfit < 0 ? "loss" : "profit"}`}>
//                     <span>Total Profit</span>
//                     <h2>₹{totalProfit.toFixed(2)}</h2>
//                 </div>

//             </div>

//             {/* FILTER */}
//             <div className="sales-filter">
//                 <input
//                     type="date"
//                     value={filterDate}
//                     onChange={(e) => setFilterDate(e.target.value)}
//                 />
//             </div>

//             {/* TABLE */}
//             <div className="table-wrapper">
//                 <table className="sales-table">
//                     <thead>
//                         <tr>
//                             <th>QR</th>
//                             <th>Date</th>
//                             <th>Product</th>
//                             <th>Size</th>
//                             <th>Price</th>
//                             <th>Profit</th>
//                             <th>Coustomer Details</th>
//                             <th>Action</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//                         {filteredSales.map((s) => (
//                             <tr key={s.id}>

//                                 <td>
//                                     <div className="qr-preview">
//                                         <QRCodeCanvas value={JSON.stringify(s)} size={100} />
//                                     </div>
//                                 </td>

//                                 <td>
//                                     {s.soldAt?.toDate
//                                         ? s.soldAt.toDate().toLocaleString()
//                                         : new Date(s.soldAt).toLocaleString()}
//                                 </td>

//                                 <td>{s.productName}</td>
//                                 <td>{s.size}</td>

//                                 <td>₹{s.sellingPrice}</td>

//                                 <td className={s.profit < 0 ? "loss" : "profit"}>
//                                     ₹{s.profit?.toFixed(2)}
//                                 </td>

//                                 <td>
//                                     {(role === "admin" || s.userId === auth.currentUser.uid) && (
//                                         <button
//                                             className="btn-delete"
//                                             disabled={deletingId === s.id}
//                                             onClick={() => handleDelete(s)}
//                                         >
//                                             {deletingId === s.id ? "Deleting..." : "Delete"}
//                                         </button>
//                                     )}
//                                 </td>

//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>

//         </div>
//     );
// };

// export default SalesHistory;

import React, { useEffect, useState } from "react";
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

const SalesHistory = ({ user }) => {

    const [sales, setSales] = useState([]);
    const [filterDate, setFilterDate] = useState("");
    const [search, setSearch] = useState("");

    const role = useUserRole();
    const [hoveredQR, setHoveredQR] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // =========================================
    // LOAD SALES
    // =========================================
    useEffect(() => {

        if (!auth.currentUser || !role) return;

        let q;

        if (role === "admin") {

            q = collection(db, "sales");

        } else {

            q = query(
                collection(db, "sales"),
                where("userId", "==", auth.currentUser.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {

            const data = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(s => !s.deleted);

            setSales(data);

        });

        return () => unsubscribe();

    }, [role]);

    // =========================================
    // FILTER
    // =========================================
    const filteredSales = sales.filter((s) => {

        // DATE FILTER
        if (filterDate) {

            let saleDate;

            if (s.soldAt?.toDate) {
                saleDate = s.soldAt.toDate().toISOString().split("T")[0];
            } else {
                saleDate = new Date(s.soldAt).toISOString().split("T")[0];
            }

            if (saleDate !== filterDate) {
                return false;
            }
        }

        // SEARCH
        if (search) {

            const keyword = search.toLowerCase();

            const customerName =
                s.customer?.name?.toLowerCase() || "";

            const customerPhone =
                s.customer?.phone?.toLowerCase() || "";

            const productName =
                s.productName?.toLowerCase() || "";

            if (
                !customerName.includes(keyword) &&
                !customerPhone.includes(keyword) &&
                !productName.includes(keyword)
            ) {
                return false;
            }
        }

        return true;
    });

    // =========================================
    // SUMMARY
    // =========================================
    const totalSales = filteredSales.length;

    const totalRevenue = filteredSales.reduce(
        (sum, s) => sum + Number(s.sellingPrice || 0),
        0
    );

    const totalProfit = filteredSales.reduce(
        (sum, s) => sum + Number(s.profit || 0),
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

            await updateDoc(
                doc(db, "sales", sale.id),
                {
                    deleted: true,
                    deletedAt: new Date()
                }
            );

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

    return (

        <div className="sales-page">

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
                    placeholder="Search customer / phone / product"
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

            </div>

            {/* TABLE */}
            <div className="table-wrapper">

                <table className="sales-table">

                    <thead>

                        <tr>

                            <th>QR</th>

                            <th>Date</th>

                            <th>Product</th>

                            <th>Size</th>

                            <th>Price</th>

                            <th>Profit</th>

                            <th>Customer Details</th>

                            <th>Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {filteredSales.map((s) => (

                            <tr key={s.id}>
                                {/* QR */}
                                <td>

                                    <div
                                        className="qr-preview"
                                        onMouseEnter={() => setHoveredQR(s.id)}
                                        onMouseLeave={() => setHoveredQR(null)}
                                    >

                                        <QRCodeCanvas
                                            value={JSON.stringify(s)}
                                            size={80}
                                            bgColor="#ffffff"
                                            fgColor="#000000"
                                            level="H"
                                            includeMargin={true}
                                        />

                                        {/* LARGE PREVIEW */}
                                        {hoveredQR === s.id && (

                                            <div className="qr-popup">

                                                <QRCodeCanvas
                                                    value={JSON.stringify(s)}
                                                    size={250}
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

                                </td>

                                {/* DATE */}
                                <td>

                                    {s.soldAt?.toDate
                                        ? s.soldAt.toDate().toLocaleString()
                                        : new Date(s.soldAt).toLocaleString()
                                    }

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

        </div>
    );
};

export default SalesHistory;