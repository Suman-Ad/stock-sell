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

const StockList = () => {
    const [stocks, setStocks] = useState([]);


    useEffect(() => {
        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setStocks([]);
                if (unsubscribeSnapshot) unsubscribeSnapshot();
                return;
            }

            const q = query(
                collection(db, "stocks"),
                where("userId", "==", user.uid)
            );

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setStocks(data);
            });
        });

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            unsubscribeAuth();
        };
    }, []);

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
            await deleteDoc(doc(db, "stocks", id));
        } catch (err) {
            alert(err.message);
        }
    };

    const getTotalQty = (sizes) => {
        return Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty || 0),
            0
        );
    };

    const getTotalInvestment = (sizes) => {
        return Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty * (s.buyingPrice || 0)),
            0
        );
    };

    const getTotalSellingValue = (sizes) => {
        return Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty * (s.sellingPrice || 0)),
            0
        );
    };

    const getTotalProfit = (sizes) => {
        return getTotalSellingValue(sizes) - getTotalInvestment(sizes);
    };

    const getAvgSellingPrice = (sizes) => {
        const totalQty = getTotalQty(sizes);
        if (!totalQty) return 0;
        return getTotalSellingValue(sizes) / totalQty;
    };

    const handleSizeUpdate = async (item, sizeKey, field, value) => {
        try {
            const updatedSizes = { ...item.sizes };

            const sizeData = updatedSizes[sizeKey];

            const newValue = Number(value);
            if (isNaN(newValue) || newValue < 0) return;

            sizeData[field] = newValue;

            // recalculate selling price
            sizeData.sellingPrice =
                sizeData.buyingPrice * (1 + sizeData.margin / 100);

            await updateDoc(doc(db, "stocks", item.id), {
                sizes: updatedSizes
            });

        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <StockSummary stocks={stocks} />
            <h2>Stock List</h2>

            <table border="1" cellPadding="10" width="100%">
                <thead>
                    <tr>
                        <th>Catalog</th>
                        <th>Sizes - Quantity - Prices - Margin%</th>
                        <th>Total Qty</th>
                        <th>Total Investment</th>
                        <th>Avg Selling Price</th>
                        <th>Total Selling Value</th>
                        <th>Profit</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                    {stocks.map((item) => {
                        const totalQty = getTotalQty(item.sizes);
                        const totalInvestment = getTotalInvestment(item.sizes);
                        const totalSelling = getTotalSellingValue(item.sizes);
                        const profit = getTotalProfit(item.sizes);
                        const avgSelling = getAvgSellingPrice(item.sizes);

                        return (
                            <tr key={item.id}>
                                <td>{item.catalogId}</td>

                                <td>
                                    <td>
                                        {Object.entries(item.sizes || {}).map(([size, data]) => (
                                            <div key={size} style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                                                <b>{size}</b>

                                                <input
                                                    type="number"
                                                    value={data.qty}
                                                    style={{ width: "60px", marginLeft: "5px" }}
                                                    onChange={(e) =>
                                                        handleSizeUpdate(item, size, "qty", e.target.value)
                                                    }
                                                />

                                                <input
                                                    type="number"
                                                    value={data.buyingPrice}
                                                    placeholder="Buy"
                                                    style={{ width: "70px", marginLeft: "5px" }}
                                                    onChange={(e) =>
                                                        handleSizeUpdate(item, size, "buyingPrice", e.target.value)
                                                    }
                                                />

                                                <input
                                                    type="number"
                                                    value={data.margin}
                                                    placeholder="%"
                                                    style={{ width: "60px", marginLeft: "5px" }}
                                                    onChange={(e) =>
                                                        handleSizeUpdate(item, size, "margin", e.target.value)
                                                    }
                                                />

                                                <span style={{ marginLeft: "8px" }}>
                                                    ₹{(data.sellingPrice || 0).toFixed(2)}
                                                </span>

                                                <button
                                                    onClick={async () => {
                                                        const updatedSizes = { ...item.sizes };
                                                        delete updatedSizes[size];

                                                        if (Object.keys(updatedSizes).length === 0) {
                                                            alert("At least one size required");
                                                            return;
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
                                        ))}
                                    </td>
                                </td>

                                <td>{totalQty}</td>
                                <td>₹{totalInvestment.toFixed(2)}</td>
                                <td>₹{avgSelling.toFixed(2)}</td>
                                <td>₹{totalSelling.toFixed(2)}</td>
                                <td style={{ color: "green", fontWeight: "bold" }}>
                                    ₹{profit.toFixed(2)}
                                </td>
                                <td>
                                    <button onClick={() => handleDelete(item.id)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default StockList;