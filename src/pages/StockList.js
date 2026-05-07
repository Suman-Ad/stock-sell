import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    writeBatch,
    getDocs
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import StockSummary from "./StockSummary";
import { QRCodeCanvas } from "qrcode.react";
import useUserRole from "../hooks/useUserRole";
import StockInventory from "./StockInventory";
import "../assets/StockList.css";

const createQRCodes = async (item, sizeKey, quantity) => {
    const batch = writeBatch(db);
    const sizeData = item.sizes[sizeKey];
    const start = sizeData.initialQty || 0;

    for (let i = 1; i <= quantity; i++) {
        const unitNo = start + i;

        const ref = doc(collection(db, "qrcodes"));

        batch.set(ref, {
            stockId: item.id,
            productName: item.productName,
            productId: item.productId,
            catalogId: item.catalogId,
            category: item.category || "",
            subCategory: item.subCategory || "",
            productType: item.productType || "",
            size: sizeKey,
            color: item.color || "",
            unitNo,
            uniqueId: `${item.productId}-${sizeKey}-${item.id}-${unitNo}`,
            sellingPrice: sizeData.sellingPrice || 0,
            status: "available",
            printed: false,
            createdAt: serverTimestamp()
        });
    }

    await batch.commit();
};

const StockList = ({ user }) => {
    const [showInventory, setShowInventory] = useState(false);
    // Print 
    const [printItem, setPrintItem] = useState(null);
    const [selectedSize, setSelectedSize] = useState("ALL");
    const [printedIds, setPrintedIds] = useState(new Set());
    const [qrData, setQrData] = useState([]);


    useEffect(() => {
        const q = query(collection(db, "qrcodes"));

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setQrData(data);
        });

        return () => unsub();
    }, []);

    const role = useUserRole();

    const isAdmin =
        role === "superadmin" ||
        role === "admin";

    const [stocks, setStocks] = useState([]);
    const [searchId, setSearchId] = useState("");
    const [selectedUser, setSelectedUser] = useState("all");
    const [showQR, setShowQR] = useState({});
    const toggleQR = (id) => {
        setShowQR(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const [qrPopup, setQrPopup] = useState({
        open: false,
        value: ""
    });

    const [soldIds, setSoldIds] = useState(new Set());

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "sales"), (snapshot) => {
            const ids = new Set(snapshot.docs.map(doc => doc.data().uniqueId));
            setSoldIds(ids);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!auth.currentUser || !role) return;

        let q;

        if (role === "superadmin" || role === "admin") {
            // ✅ Admin / SuperAdmin → see ALL stocks
            q = query(collection(db, "stocks"));
        } else {
            // ✅ Normal user → only own stocks
            q = query(
                collection(db, "stocks"),
                where("userId", "==", auth.currentUser.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStocks(data);
        });

        return () => unsubscribe();
    }, [role]);

    // Update price/margin
    const handleUpdate = async (id, field, value) => {
        try {
            await updateDoc(doc(db, "stocks", id), {
                [field]: Number(value)
            });
        } catch (err) {
            alert(err.message);
        }
    };

    // Delete stock
    const handleDelete = async (item) => {
        if (!window.confirm("Delete this item?")) return;

        if (user.uid !== item.userId) {
            alert("You are not authorized");
            return;
        }

        try {
            // 🔥 1. Find all QR linked to this stock
            const q = query(
                collection(db, "qrcodes"),
                where("stockId", "==", item.id)
            );

            const snapshot = await getDocs(q);

            // 🔥 2. Batch delete all QR
            const batch = writeBatch(db);

            snapshot.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });

            // 🔥 3. Delete stock itself
            batch.delete(doc(db, "stocks", item.id));

            // 🔥 4. Commit everything together
            await batch.commit();

            alert("Stock + QR deleted successfully");

        } catch (err) {
            console.error(err);
            alert("Delete failed");
        }
    };

    const getTotalQty = (sizes) => {
        return Number(Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty || 0),
            0
        ).toFixed(0));
    };

    const getTotalInvestment = (sizes) => {
        return Number(Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty * (s.buyingPrice || 0)),
            0
        ).toFixed(0));
    };

    const getTotalSellingValue = (sizes) => {
        return Number(Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty * (s.sellingPrice || 0)),
            0
        ).toFixed(0));
    };

    const getTotalExtraCost = (sizes) => {
        return Object.values(sizes || {}).reduce((sum, s) => {
            const extraCosts = s.extraCosts || {};
            const qty = Number(s.qty || 0);

            const breake =
                Number(extraCosts.packaging || 0) +
                Number(extraCosts.labeling || 0) +
                Number(extraCosts.rto || 0) +
                Number(extraCosts.returnCost || 0) +
                Number(extraCosts.advertisementCost || 0) +
                Number(extraCosts.delivery || 0) +
                Number(extraCosts.others || 0);

            return sum + (breake * qty);
        }, 0);
    };

    // const getTotalProfit = (sizes) => {
    //     return Number(Object.values(sizes || {}).reduce((sum, s) => {

    //         const buying = Number(s.buyingPrice || 0);
    //         const selling = Number(s.sellingPrice || 0);
    //         const qty = Number(s.qty || 0);

    //         const extra =
    //             Number(s.extraCosts?.packaging || 0) +
    //             Number(s.extraCosts?.labeling || 0) +
    //             Number(s.extraCosts?.rto || 0) +
    //             Number(s.extraCosts?.returnCost || 0) +
    //             Number(s.extraCosts?.advertisementCost || 0) +
    //             Number(s.extraCosts?.delivery || 0) +
    //             Number(s.extraCosts?.others || 0);

    //         const gstPercent = Number(s.extraCosts?.gst || 0);

    //         // remove GST from selling
    //         const sellingWithoutGST = selling / (1 + gstPercent / 100);

    //         const profitPerUnit = selling - buying - extra;

    //         return sum + (profitPerUnit * qty);

    //     }, 0).toFixed(0));
    // };

    const getTotalProfit = (sizes) => {
        return Number(Object.values(sizes || {}).reduce((sum, s) => {

            const buying = Number(s.buyingPrice || 0);
            const margin = Number(s.qty) * (buying * Number(s.margin || 0)) / 100;

            return sum + margin;

        }, 0).toFixed(0));
    };

    const getAvgSellingPrice = (sizes) => {
        const totalQty = getTotalQty(sizes);
        if (!totalQty) return 0;
        return Number((getTotalSellingValue(sizes) / totalQty).toFixed(0));
    };

    const getSellingPrice = (buying, margin, extraCosts = {}) => {
        const {
            packaging = 0,
            labeling = 0,
            rto = 0,
            returnCost = 0,
            advertisementCost = 0,
            delivery = 0,
            others = 0,
            gst = 0
        } = extraCosts;

        const breakEven =
            Number(buying) * (1 + Number(margin || 0) / 100) +
            Number(packaging) +
            Number(labeling) +
            Number(rto) +
            Number(returnCost) +
            Number(advertisementCost) +
            Number(delivery) +
            Number(others);



        const withGST = breakEven * (1 + gst / 100);

        return Number(withGST.toFixed(0));
    };


    const handleSizeUpdate = async (item, sizeKey, field, value) => {
        try {
            const updatedSizes = { ...item.sizes };
            const sizeData = updatedSizes[sizeKey];

            const newValue = Number(value);
            if (isNaN(newValue) || newValue < 0) return;

            sizeData[field] = newValue;

            // ✅ ensure extraCosts exists
            if (!sizeData.extraCosts) {
                sizeData.extraCosts = {
                    packaging: 0,
                    labeling: 0,
                    rto: 0,
                    returnCost: 0,
                    advertisementCost: 0,
                    delivery: 0,
                    gst: 0
                };
            }

            // ✅ recalculate correctly
            sizeData.sellingPrice = getSellingPrice(
                sizeData.buyingPrice,
                sizeData.margin,
                sizeData.extraCosts
            );

            await updateDoc(doc(db, "stocks", item.id), {
                sizes: updatedSizes
            });

        } catch (err) {
            alert(err.message);
        }
    };

    const getSoldCount = (item, size) => {
        return qrData.filter(qr =>
            qr.stockId === item.id &&
            qr.size === size &&
            qr.status === "sold"
        ).length;
    };

    const handleQtyChange = async (item, sizeKey, newQty) => {
        const updatedSizes = { ...item.sizes };
        const sizeData = updatedSizes[sizeKey];

        const soldCount = getSoldCount(item, sizeKey);

        // ❌ Prevent breaking QR system
        if (newQty < soldCount) {
            alert(`Cannot set qty below sold items (${soldCount})`);
            return;
        }

        const oldQty = sizeData.qty || 0;
        const oldInitial = sizeData.initialQty || 0;

        const diff = newQty - oldQty;

        sizeData.qty = newQty;

        // ✅ Only increase initialQty
        if (diff > 0) {
            sizeData.initialQty = oldInitial + diff;
        }

        await updateDoc(doc(db, "stocks", item.id), {
            sizes: updatedSizes
        });
    };

    const handleAddStock = async (item, sizeKey, amount) => {
        const confirmReduce = window.confirm(
            `Add ${amount} item(s) from ${item.productName} (${sizeKey}). Please confirm befor Add ?`
        );

        if (!confirmReduce) return;

        await createQRCodes(item, sizeKey, amount);

        const updatedSizes = { ...item.sizes };
        const sizeData = updatedSizes[sizeKey];

        sizeData.qty = (sizeData.qty || 0) + amount;
        sizeData.initialQty = (sizeData.initialQty || 0) + amount;

        await updateDoc(doc(db, "stocks", item.id), {
            sizes: updatedSizes
        });
    };

    const handleReduceStock = async (item, sizeKey, amount) => {
        const confirmReduce = window.confirm(
            `Reduce ${amount} item(s) from ${item.productName} (${sizeKey}). Please confirm befor remove ?`
        );

        if (!confirmReduce) return;

        const availableQR = qrData
            .filter(qr =>
                qr.stockId === item.id &&
                qr.size === sizeKey &&
                qr.status === "available"
            )
            .sort((a, b) => b.unitNo - a.unitNo); // latest first

        const toRemove = availableQR.slice(0, amount);

        for (let qr of toRemove) {
            await updateDoc(doc(db, "qrcodes", qr.id), {
                status: "removed"
            });
        }

        // update stock qty only
        const updatedSizes = { ...item.sizes };
        updatedSizes[sizeKey].qty -= amount;

        await updateDoc(doc(db, "stocks", item.id), {
            sizes: updatedSizes
        });
    };


    const userList = [
        ...new Map(
            stocks
                .filter(item => item.userId)
                .map(item => [
                    item.userId,
                    {
                        userId: item.userId,
                        userName: item.createdBy?.name,
                        userShopName: item.createdBy?.shopName,
                        userMobile: item.createdBy?.mobile,
                        userEmail: item.createdBy?.email,
                    }
                ])
        ).values()
    ];

    const filteredStocks = stocks.filter(item => {

        // 🔥 User filter
        if (
            (role === "admin" || role === "superadmin") &&
            selectedUser !== "all" &&
            item.userId !== selectedUser
        ) {
            return false;
        }

        // 🔥 Catalog filter
        if (
            searchId &&
            !item.catalogId?.toUpperCase().includes(searchId.toUpperCase())
        ) {
            return false;
        }

        return true;
    });

    const getItemQR = (item) => {
        return qrData.filter(qr =>
            qr.stockId === item.id &&
            qr.status === "available"
        );
    };

    const handlePrint = async (item) => {
        const qrs = getItemQR(item);

        for (const qr of qrs) {
            await updateDoc(doc(db, "qrcodes", qr.id), {
                printed: true
            });
        }

        window.print();
    };


    return (
        <div className="stock-page" >
            <StockSummary stocks={filteredStocks} />
            <>
                <button onClick={() => setShowInventory(true)}>
                    Add New Items
                </button>

                {user && showInventory && (
                    <div className="modal-overlay">
                        <div className="modal-box">

                            {/* Header */}
                            <div className="modal-header">
                                <h3>Add New Items</h3>
                                <button className="close-btn" onClick={() => setShowInventory(false)}>❌</button>
                            </div>

                            {/* Content */}
                            <div className="modal-content" >
                                <StockInventory user={user} />
                            </div>

                        </div>
                    </div>
                )}
            </>

            <h2>Stock List</h2>
            {/* 👤 User Filter */}
            {(role === "admin" || role === "superadmin") && (
                <div style={{ marginBottom: "10px" }}>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        style={{
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #ccc",
                            minWidth: "250px"
                        }}
                    >
                        <option value="all">All Users</option>

                        {userList.map((u) => (
                            <option key={u.userId} value={u.userId}>
                                {u.userShopName}:({u.userName}-{u.userEmail}-{u.userMobile})
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <input
                placeholder="Search by Catalog ID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                style={{ marginBottom: "15px", padding: "8px", width: "250px" }}
            />
            <div className="table-wrapper">
                <table className="stock-table" border="1" cellPadding="10" style={{ borderCollapse: "collapse", overflowX: "auto", display: "block", width: "100%" }}>
                    <thead>
                        <tr>
                            {isAdmin && (
                                <th>Shop Name</th>
                            )}
                            {isAdmin && (
                                <th>Proprietor Name</th>
                            )}
                            <th>Product Name</th>
                            <th>Product ID</th>
                            <th>Catalog ID</th>
                            <th>Sizes - Quantity - Prices - Margin%</th>
                            <th>Total Qty</th>
                            <th>Total Investment</th>
                            <th>Total Extra Cost</th>
                            <th>Avg Selling Price</th>
                            <th>Total Selling Value</th>
                            <th>Profit</th>
                            <th>QR Codes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredStocks.map((item) => {
                            const totalQty = getTotalQty(item.sizes);
                            const totalInvestment = getTotalInvestment(item.sizes);
                            const totalExtraCost = getTotalExtraCost(item.sizes);
                            const totalSelling = getTotalSellingValue(item.sizes);
                            const profit = getTotalProfit(item.sizes);
                            const avgSelling = getAvgSellingPrice(item.sizes);
                            const qrCodes = getItemQR(item);

                            return (
                                <tr key={item.id}>
                                    {isAdmin && (
                                        <td>{item.createdBy?.shopName || "N/A"}</td>
                                    )}
                                    {isAdmin && (
                                        <td>{item.createdBy?.name || "N/A"}</td>
                                    )}
                                    <td>{item.productName}</td>
                                    <td>{item.productId}</td>
                                    <td>{item.catalogId}</td>

                                    <td>
                                        <div style={{ overflowY: "auto", maxHeight: "365px" }} >
                                            {Object.entries(item.sizes || {}).map(([size, data]) => {
                                                const soldCount = getSoldCount(item, size);
                                                const total = data.initialQty ?? 0;
                                                const available = data.qty ?? 0;
                                                const removedCount = qrData.reduce((count, qr) => {
                                                    if (
                                                        qr.stockId === item.id &&
                                                        qr.size === size &&
                                                        qr.status === "removed"
                                                    ) {
                                                        return count + 1;
                                                    }
                                                    return count;
                                                }, 0);
                                                return (
                                                    <div key={size} style={{ marginBottom: "8px", alignItems: "center", gap: "5px", border: "1px solid #0b1d25", padding: "5px", borderRadius: "5px" }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "5px" }}>
                                                            <label>Size:- {size}</label>
                                                            <span style={{ marginLeft: "8px" }}>
                                                                <small>Listing Price:</small> ₹{(data.sellingPrice || 0).toFixed(2)}<small>/Unit</small>
                                                            </span>
                                                            <span>
                                                                <small>Extra Cost:</small> ₹
                                                                {(
                                                                    data.extraCosts.packaging +
                                                                    data.extraCosts.labeling +
                                                                    data.extraCosts.rto +
                                                                    data.extraCosts.returnCost +
                                                                    data.extraCosts.advertisementCost +
                                                                    data.extraCosts.delivery +
                                                                    data.extraCosts.others
                                                                )}
                                                                <small>/Unit</small>
                                                            </span>
                                                            <span>
                                                                <small>Gst Amount:</small> ₹
                                                                {
                                                                    (((data.buyingPrice * (1 + data.margin / 100)) +
                                                                        (
                                                                            data.extraCosts.packaging +
                                                                            data.extraCosts.labeling +
                                                                            data.extraCosts.rto +
                                                                            data.extraCosts.returnCost +
                                                                            data.extraCosts.advertisementCost +
                                                                            data.extraCosts.delivery +
                                                                            data.extraCosts.others
                                                                        )) * data.extraCosts.gst) / 100
                                                                }
                                                                <small>/Unit</small>
                                                            </span>
                                                            <span><small>Profit:</small> ₹{(data.buyingPrice * data.margin) / 100}<small>/Unit</small></span>
                                                            {data.sellingPrice <
                                                                data.buyingPrice && (
                                                                    <span style={{ color: "red", fontSize: "10px" }}>
                                                                        ⚠ Loss
                                                                    </span>
                                                                )}
                                                            <button
                                                                onClick={async () => {
                                                                    const updatedSizes = { ...item.sizes };
                                                                    delete updatedSizes[size];

                                                                    if (Object.keys(updatedSizes).length === 0) {
                                                                        alert("At least one size required");
                                                                        return;
                                                                    }
                                                                    if (user.uid !== item.userId) {
                                                                        alert("You are not authorizes");
                                                                        return
                                                                    }
                                                                    await updateDoc(doc(db, "stocks", item.id), {
                                                                        sizes: updatedSizes
                                                                    });
                                                                }}
                                                                style={{ marginLeft: "5px" }}
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>

                                                        <div style={{ fontSize: "10px", color: "gray" }}>
                                                            Sold: {soldCount} | Available: {available} | Total: {total} | Removed: {removedCount}
                                                        </div>
                                                        <div key={size} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>

                                                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                                                <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Qty:-
                                                                    <button
                                                                        onClick={() => handleReduceStock(item, size, 1)}
                                                                        style={{ padding: "2px 2px" }}
                                                                    >
                                                                        ➖
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        value={data.qty}
                                                                        readOnly
                                                                        style={{ width: "60px", marginLeft: "5px", marginLeft: "2px" }}
                                                                    />
                                                                    <button
                                                                        style={{ padding: "2px 2px" }}
                                                                        onClick={() => handleAddStock(item, size, 1)}
                                                                    >
                                                                        ➕
                                                                    </button>
                                                                </legend>
                                                                <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Buy:-
                                                                    <input
                                                                        type="number"
                                                                        value={data.buyingPrice}
                                                                        placeholder="Buy"
                                                                        style={{ width: "70px", marginLeft: "5px" }}
                                                                        onChange={(e) =>
                                                                            handleSizeUpdate(item, size, "buyingPrice", e.target.value)
                                                                        }
                                                                    />
                                                                </legend>
                                                                <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Margin%:-
                                                                    <input
                                                                        type="number"
                                                                        value={data.margin}
                                                                        placeholder="%"
                                                                        style={{ width: "60px", marginLeft: "5px" }}
                                                                        onChange={(e) =>
                                                                            handleSizeUpdate(item, size, "margin", e.target.value)
                                                                        }
                                                                    />
                                                                </legend>
                                                            </div>
                                                            <div style={{
                                                                display: "grid",
                                                                gridTemplateColumns: "repeat(4, 1fr)", // ✅ 5 columns
                                                                gap: "6px",
                                                                marginTop: "6px",
                                                                borderTop: "1px dashed #ccc",
                                                                paddingTop: "6px",
                                                                width: "100%"
                                                            }}>
                                                                {["packaging", "labeling", "rto", "returnCost", "advertisementCost", "delivery", "others", "gst"].map((key) => (
                                                                    <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                                        <legend key={key} style={{ fontSize: "10px", color: "gray" }}>{key.toUpperCase()}</legend>
                                                                        <input
                                                                            key={key}
                                                                            type="number"
                                                                            placeholder={key}
                                                                            value={data.extraCosts?.[key] || 0}
                                                                            style={{ width: "65px", fontSize: "10px" }}
                                                                            onChange={(e) => {
                                                                                const updatedSizes = { ...item.sizes };

                                                                                if (!updatedSizes[size].extraCosts) {
                                                                                    updatedSizes[size].extraCosts = {};
                                                                                }

                                                                                updatedSizes[size].extraCosts[key] = Number(e.target.value);

                                                                                // 🔥 recalc instantly
                                                                                updatedSizes[size].sellingPrice = getSellingPrice(
                                                                                    updatedSizes[size].buyingPrice,
                                                                                    updatedSizes[size].margin,
                                                                                    updatedSizes[size].extraCosts
                                                                                );

                                                                                updateDoc(doc(db, "stocks", item.id), {
                                                                                    sizes: updatedSizes
                                                                                });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>

                                    <td>{totalQty}</td>
                                    <td>₹{totalInvestment.toFixed(2)}</td>
                                    <td>₹{totalExtraCost.toFixed(2)}</td>
                                    <td>₹{avgSelling.toFixed(2)}</td>
                                    <td>₹{totalSelling.toFixed(2)}</td>
                                    <td style={{
                                        color: profit < 0 ? "red" : "green",
                                        fontWeight: "bold"
                                    }}>
                                        ₹{profit.toFixed(2)}
                                    </td>
                                    <td>
                                        <div key={item.catalogId} style={{
                                            border: "1px solid #ccc",
                                            marginBottom: "20px",
                                            padding: "10px",
                                            height: "inherit",
                                        }}>
                                            <button onClick={() => toggleQR(item.catalogId)}>
                                                {showQR[item.catalogId] ? "Hide QR" : "Show QR"}
                                            </button>

                                            {showQR[item.catalogId] && (
                                                <div className="qr-box">
                                                    <p><b>Catalog ID:</b> {item.catalogId}</p>
                                                    <p><b>Count:</b> {qrCodes.length}</p>
                                                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px", overflow: "auto", maxHeight: "190px" }}>
                                                        {qrCodes.map((qr, index) => {
                                                            const qrObj = qr;
                                                            const isNew = !qr.printed;

                                                            return (
                                                                <div key={qr.id} className={`qr-card ${!qr.printed ? "new" : ""}`}
                                                                    onClick={() => setQrPopup({ open: true, value: JSON.stringify(qr) })}
                                                                >
                                                                    <QRCodeCanvas value={JSON.stringify(qr)} size={100} />
                                                                    {!qr.printed && (
                                                                        <div style={{ color: "green", fontWeight: "bold" }}>
                                                                            NEW
                                                                        </div>
                                                                    )}

                                                                    <div style={{ fontWeight: "bold" }}>
                                                                        {qrObj.productType}
                                                                    </div>

                                                                    <div>{qrObj.color}</div>

                                                                    <div style={{ fontWeight: "bold" }}>
                                                                        Size: {qrObj.size}
                                                                    </div>

                                                                    <div>₹{qrObj.sellingPrice}</div>

                                                                    <div style={{ fontSize: "8px" }}>
                                                                        {qrObj.catalogId}
                                                                    </div>
                                                                </div>

                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </td>
                                    <td>
                                        <button onClick={() => {
                                            setSelectedSize("ALL");
                                            setPrintItem(item);
                                        }}>
                                            🖨 Print
                                        </button>
                                        <button onClick={() => handleDelete(item)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {qrPopup.open && (
                <div className="qr-overlay">
                    <div className="qr-modal">

                        <h3>Scan QR Code</h3>

                        <QRCodeCanvas
                            value={qrPopup.value}
                            size={280}
                            className="print-area"
                            bgColor="#ffffff"   // ✅ white background
                            fgColor="#000000"   // ✅ black QR
                            level="H"           // ✅ high error correction
                            includeMargin={true} />


                        {/* <p style={{ marginTop: 10 }}>{qrPopup.value}</p> */}
                        <div style={{ padding: "5px 5px" }} >
                            <button style={{ padding: "2px 5px", margin: "5px" }} onClick={() => window.print()}>Download</button>

                            <button style={{ padding: "2px 5px", }} onClick={() => setQrPopup({ open: false, value: "" })}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {printItem && (
                <div className="print-overlay" >
                    <div className="print-modal" >
                        <h3>QR Preview - {printItem.productName}</h3>
                        <select onChange={(e) => setSelectedSize(e.target.value)}>
                            <option value="ALL">All</option>
                            {Object.keys(printItem.sizes).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <button onClick={async () => {
                            const qrs = getItemQR(printItem)
                                .filter(qr => selectedSize === "ALL" || qr.size === selectedSize);

                            for (const qr of qrs) {
                                await updateDoc(doc(db, "qrcodes", qr.id), {
                                    printed: true
                                });
                            }

                            window.print();
                        }}>
                            🖨 Print
                        </button>
                        <button onClick={() => setPrintItem(null)}>❌ Close</button>

                        <div className="print-area" >
                            {getItemQR(printItem)
                                .filter(qr => selectedSize === "ALL" || qr.size === selectedSize)
                                .map((qr, index) => {

                                    return (
                                        <div key={qr.id}
                                            className="qr-box" style={{ width: "170px" }} >
                                            <div className={`qr-card ${!qr.printed ? "new" : ""}`} style={{ width: "160px", background: !qr.printed ? "" : "white" }}>
                                                <div style={{ color: !qr.printed ? "" : "black" }} >
                                                    <b>{qr.productType}</b>-
                                                    {qr.color}-
                                                    Size: {qr.size}
                                                </div>
                                                <QRCodeCanvas
                                                    value={JSON.stringify(qr)}
                                                    size={150}
                                                    bgColor="#ffffff"   // ✅ white background
                                                    fgColor="#000000"   // ✅ black QR
                                                    level="H"           // ✅ high error correction
                                                    includeMargin={true}
                                                />
                                                <div style={{ color: !qr.printed ? "" : "black" }} >
                                                    #{qr.unitNo}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    overlayQr: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },
    modalQr: {
        background: "#fff",
        padding: 20,
        borderRadius: 10,
        textAlign: "center",
        // minWidth: "300px",
        maxWidth: "100%",
        maxHeight: "90%",
        overflowY: "auto",
        flexDirection: "column",
        display: "flex",
        gap: "20px"
    },
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
    },

    modal: {
        background: "#fff",
        width: "95%",
        maxWidth: "1200px",
        maxHeight: "90vh",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 15px",
        borderBottom: "1px solid #ddd",
        background: "#f5f5f5"
    },

    content: {
        padding: "15px",
        overflowY: "auto"
    }
};

export default StockList;

