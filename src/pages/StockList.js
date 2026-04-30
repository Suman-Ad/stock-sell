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

    // Calculate totals
    const getTotalQty = (sizes) => {
        return Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty || 0),
            0
        );
    };

    const getTotalValue = (item) => {
        const totalQty = getTotalQty(item.sizes);
        return totalQty * (item.buyingPrice || 0);
    };

    const getSellingPrice = (item) => {
        return (item.buyingPrice || 0) + (item.margin || 0);
    };

    const getTotalSellingValue = (item) => {
        const totalQty = getTotalQty(item.sizes);
        return totalQty * getSellingPrice(item);
    };

    const getProfit = (item) => {
        const totalQty = getTotalQty(item.sizes);
        return totalQty * (item.margin || 0);
    };

    const handleSizeUpdate = async (item, sizeKey, newQty) => {
        try {
            const qty = Number(newQty);

            if (isNaN(qty) || qty < 0) return;

            const updatedSizes = {
                ...item.sizes,
                [sizeKey]: {
                    qty
                }
            };

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
                        <th>Sizes</th>
                        <th>Total Qty</th>
                        <th>Buying Price</th>
                        <th>Margin</th>
                        <th>Selling Price</th>
                        <th>Total Selling</th>
                        <th>Profit</th>
                        <th>Total Value</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                    {stocks.map((item) => {
                        const totalQty = getTotalQty(item.sizes);
                        const totalValue = getTotalValue(item);
                        const sellingPrice = getSellingPrice(item);
                        const totalSelling = getTotalSellingValue(item);
                        const profit = getProfit(item);

                        return (
                            <tr key={item.id}>
                                <td>{item.catalogId}</td>

                                <td>
                                    <td>
                                        {Object.entries(item.sizes || {}).map(([size, data]) => (
                                            <div key={size} style={{ marginBottom: "5px" }}>
                                                <b>{size}</b>:

                                                <input
                                                    type="number"
                                                    value={data.qty}
                                                    style={{ width: "60px", marginLeft: "5px" }}
                                                    onChange={(e) =>
                                                        handleSizeUpdate(item, size, e.target.value)
                                                    }
                                                />

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

                                <td>
                                    <input
                                        type="number"
                                        defaultValue={item.buyingPrice || 0}
                                        onBlur={(e) =>
                                            handleUpdate(item.id, "buyingPrice", e.target.value)
                                        }
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        defaultValue={item.margin || 0}
                                        onBlur={(e) =>
                                            handleUpdate(item.id, "margin", e.target.value)
                                        }
                                    />
                                </td>
                                <td>{sellingPrice}</td>
                                <td>{totalSelling}</td>
                                <td style={{ color: "green", fontWeight: "bold" }}>
                                    {profit}
                                </td>

                                <td>{totalValue}</td>

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