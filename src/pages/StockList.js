import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import StockSummary from "./StockSummary";
import { QRCodeCanvas } from "qrcode.react";
import useUserRole from "../hooks/useUserRole";

const StockList = ({ user }) => {
    // Print 
    const [printItem, setPrintItem] = useState(null);
    const [selectedSize, setSelectedSize] = useState("ALL");

    const role = useUserRole();

    const isAdmin =
        role === "superadmin" ||
        role === "admin";

    const [stocks, setStocks] = useState([]);
    const [searchId, setSearchId] = useState("");
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
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this item?")) return;

        try {
            if (user.uid !== id.userId) {
                alert("You are not authorized");
                return
            };
            await deleteDoc(doc(db, "stocks", id.id));
        } catch (err) {
            alert(err.message);
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

    const getTotalProfit = (sizes) => {
        return Number((getTotalSellingValue(sizes) - getTotalInvestment(sizes)).toFixed(0));
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
            gst = 0
        } = extraCosts;

        const breakEven =
            Number(buying) * (1 + margin / 100) +
            Number(packaging) +
            Number(labeling) +
            Number(rto) +
            Number(returnCost) +
            Number(advertisementCost) +
            Number(delivery);

        

        const withGST = breakEven * (1 + Number(gst) / 100);

        return Number(withGST.toFixed(0)) ;
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

    const filteredStocks = stocks.filter(item =>
        item.catalogId?.includes(searchId)
    );

    const generateQRCodes = (item) => {
        const qrList = [];

        Object.entries(item.sizes).forEach(([size, data]) => {
            // const totalUnits = data.initialQty || data.qty;
            for (let i = 1; i <= data.qty; i++) {

                const qrData = {
                    stockId: item.id,
                    productName: item.productName,
                    catalogId: item.catalogId,
                    productId: item.productId,

                    category: item.category || "",
                    subCategory: item.subCategory || "",
                    productType: item.productType || "",

                    color: item.color || "",
                    size: size,

                    sellingPrice: data.sellingPrice || 0,

                    unitNo: i,
                    uniqueId: `${item.productId}-${size}-${item.id}-${i}`,

                    createdAt: new Date().toISOString()
                };

                if (!soldIds.has(qrData.uniqueId)) {
                    qrList.push({
                        size,
                        code: JSON.stringify(qrData)
                    });
                }
                // qrList.push({
                //     size,
                //     code: JSON.stringify(qrData)
                // });

            }
        });

        return qrList;
    };

    return (
        <div style={{ padding: "20px" }}>
            <StockSummary stocks={stocks} />
            <h2>Stock List</h2>
            <input
                placeholder="Search by Catalog ID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                style={{ marginBottom: "15px", padding: "8px", width: "250px" }}
            />

            <table border="1" cellPadding="10" style={{ borderCollapse: "collapse", overflowX: "auto", display: "block", width: "100%" }}>
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
                        const totalSelling = getTotalSellingValue(item.sizes);
                        const profit = getTotalProfit(item.sizes);
                        const avgSelling = getAvgSellingPrice(item.sizes);
                        const qrCodes = generateQRCodes(item);

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
                                        {Object.entries(item.sizes || {}).map(([size, data]) => (
                                            <div key={size} style={{ marginBottom: "8px", alignItems: "center", gap: "5px", border: "1px solid #0b1d25", padding: "5px", borderRadius: "5px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "5px" }}>
                                                    <label>Size:- {size}</label>
                                                    <span style={{ marginLeft: "8px" }}>
                                                        ₹{(data.sellingPrice || 0).toFixed(2)}<small>/Unit</small>
                                                    </span>
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

                                                <div key={size} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>

                                                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                                        <legend style={{ fontSize: "10px", color: "gray", whiteSpace: "nowrap" }}>Qty:-
                                                            <input
                                                                type="number"
                                                                value={data.qty}
                                                                style={{ width: "60px", marginLeft: "5px" }}
                                                                onChange={(e) =>
                                                                    handleSizeUpdate(item, size, "qty", e.target.value)
                                                                }
                                                            />
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
                                        ))}
                                    </div>
                                </td>

                                <td>{totalQty}</td>
                                <td>₹{totalInvestment.toFixed(2)}</td>
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
                                            <div style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "10px"
                                            }}>
                                                <p><b>Catalog ID:</b> {item.catalogId}</p>
                                                <p><b>Count:</b> {qrCodes.length}</p>
                                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px", overflow: "auto", maxHeight: "190px" }}>
                                                    {qrCodes.map((qr, index) => {
                                                        const qrObj = JSON.parse(qr.code);

                                                        return (
                                                            <div key={index} style={{
                                                                width: "120px",
                                                                border: "1px solid #000",
                                                                padding: "5px",
                                                                textAlign: "center",
                                                                fontSize: "10px",
                                                                borderRadius: "6px",
                                                                overflow: "hidden",
                                                            }}
                                                                onClick={() => setQrPopup({ open: true, value: qr.code })}
                                                            >
                                                                <QRCodeCanvas value={qr.code} size={100} />

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
                                    <button onClick={() => setPrintItem(item)}>
                                        Print QR
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


            {qrPopup.open && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>

                        <h3>Scan QR Code</h3>

                        <QRCodeCanvas value={qrPopup.value} size={280} className="print-area" />

                        {/* <p style={{ marginTop: 10 }}>{qrPopup.value}</p> */}
                        <button onClick={() => window.print()}>Download</button>

                        <button onClick={() => setQrPopup({ open: false, value: "" })}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {printItem && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0,0,0,0.7)",
                    zIndex: 999
                }}>
                    <div style={{
                        background: "#fff",
                        margin: "20px auto",
                        padding: "20px",
                        width: "90%",
                        maxHeight: "90%",
                        overflowY: "auto"
                    }}>
                        <h3>QR Preview - {printItem.productName}</h3>
                        <select onChange={(e) => setSelectedSize(e.target.value)}>
                            <option value="ALL">All</option>
                            {Object.keys(printItem.sizes).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <button onClick={() => window.print()}>🖨 Print</button>
                        <button onClick={() => setPrintItem(null)}>❌ Close</button>

                        <div className="print-area" style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginTop: "20px"
                        }}>
                            {generateQRCodes(printItem)
                                .filter(qr => selectedSize === "ALL" || qr.size === selectedSize)
                                .map((qr, index) => {
                                    const qrObj = JSON.parse(qr.code);
                                    return (
                                        <div key={index}
                                            style={{
                                                width: "120px",
                                                border: "1px solid #000",
                                                padding: "5px",
                                                textAlign: "center",
                                                fontSize: "10px"
                                            }}>
                                            <QRCodeCanvas value={qr.code} size={100} />

                                            <div>
                                                <b>{qrObj.productType}</b>
                                            </div>
                                            <div>{qrObj.color}</div>
                                            <div>Size: {qrObj.size}</div>
                                            <div>₹{qrObj.sellingPrice}</div>
                                            <div>#{qrObj.unitNo}</div>
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
    }
};

export default StockList;

