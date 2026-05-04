import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";
import { QRCodeCanvas } from "qrcode.react";

const SalesHistory = ({ user }) => {
    const [sales, setSales] = useState([]);
    const [filterDate, setFilterDate] = useState("");
    const role = useUserRole();

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
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSales(data);
        });

        return () => unsubscribe();
    }, [role]);

    const totalSales = sales.length;

    const totalRevenue = sales.reduce(
        (sum, s) => sum + (s.sellingPrice || 0),
        0
    );

    const totalProfit = sales.reduce(
        (sum, s) => sum + (s.profit || 0),
        0
    );

    const filteredSales = sales.filter(s => {
        if (!filterDate) return true;

        const saleDate = new Date(s.soldAt).toISOString().split("T")[0];
        return saleDate === filterDate;
    });

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this sale?");
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "sales", id));
        } catch (error) {
            console.error("Error deleting sale:", error);
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>🧾 Sales History</h2>

            <div style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#f5f5f5",
                borderRadius: "8px"
            }}>
                <h3>📊 Sales Summary</h3>

                <p>Total Orders: <b>{totalSales}</b></p>
                <p>Total Revenue: <b>₹{totalRevenue.toFixed(2)}</b></p>
                <p>Total Profit: <b style={{ color: "green" }}>₹{totalProfit.toFixed(2)}</b></p>
            </div>

            <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
            />

            <table border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th>QR</th>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Price</th>
                        <th>Profit</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {filteredSales.map((s, i) => (
                        <tr key={i}>
                            <td>
                                <QRCodeCanvas value={JSON.stringify(s)} size={140} />
                            </td>
                            <td>{new Date(s.soldAt).toLocaleString()}</td>
                            <td>{s.productName}</td>
                            <td>{s.size}</td>
                            <td>₹{s.sellingPrice}</td>
                            <td style={{ color: s.profit < 0 ? "red" : "green" }}>
                                ₹{s.profit?.toFixed(2)}
                            </td>
                            <td>
                                {(role === "admin" || s.userId === auth.currentUser.uid) && (
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        style={{
                                            background: "red",
                                            color: "#fff",
                                            border: "none",
                                            padding: "6px 10px",
                                            cursor: "pointer",
                                            borderRadius: "4px"
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SalesHistory;