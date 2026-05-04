import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";


const getDate = (createdAt) => {
    if (!createdAt) return null;

    // ✅ Firestore Timestamp
    if (typeof createdAt.toDate === "function") {
        return createdAt.toDate();
    }

    // ✅ Already JS Date
    if (createdAt instanceof Date) {
        return createdAt;
    }

    // ✅ String or number
    return new Date(createdAt);
};

const Dashboard = ({ user }) => {
    const [sales, setSales] = useState([]);
    const role = useUserRole();

    useEffect(() => {
        if (!auth.currentUser || !role) return;

        let q;

        if (role === "admin" || role === "superadmin") {
            q = collection(db, "sales");
        } else {
            q = query(
                collection(db, "sales"),
                where("userId", "==", auth.currentUser.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSales(snapshot.docs.map(doc => doc.data()));
        });

        return () => unsubscribe();
    }, [role]);

    const [filter, setFilter] = useState("all");

    const filterSales = () => {
        const now = new Date();

        return sales.filter((s) => {
            const saleDate = getDate(s.createdAt);
            if (!saleDate || isNaN(saleDate)) return true;

            if (filter === "today") {
                return saleDate.toDateString() === now.toDateString();
            }

            if (filter === "week") {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                return saleDate >= weekAgo;
            }

            if (filter === "month") {
                return (
                    saleDate.getMonth() === now.getMonth() &&
                    saleDate.getFullYear() === now.getFullYear()
                );
            }

            return true;
        });
    };

    const filteredSales = filterSales();


    // 🔥 Calculations
    const totalSales = filteredSales.length;

    const totalRevenue = filteredSales.reduce(
        (sum, s) => sum + (s.sellingPrice || 0),
        0
    );

    const totalCost = filteredSales.reduce(
        (sum, s) => sum + (s.buyingPrice || 0),
        0
    );

    const totalProfit = totalRevenue - totalCost;

    const profitColor = totalProfit >= 0 ? "#16a34a" : "#dc2626";


    return (
        <div style={{ padding: "20px", background: "#f9fafb", minHeight: "100vh" }}>

            {/* 🔹 Welcome Section */}
            <div style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                marginBottom: "20px"
            }}>
                <h2>👋 Welcome, {user?.name || "User"}!</h2>
                <p style={{ margin: "5px 0", color: "#555" }}>
                    📧 {user?.email}
                </p>
                <p style={{ margin: "5px 0", color: "#555" }}>
                    🛡 Role: <b>{role}</b>
                </p>
                <p style={{ margin: "5px 0", color: "#999", fontSize: "12px" }}>
                    UID: {auth.currentUser?.uid?.slice(0, 8)}...
                </p>
            </div>

            {/* 🔹 Stats Cards */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px"
            }}>

                {/* Total Sales */}
                <div style={cardStyle}>
                    <h4>📦 Total Sales</h4>
                    <h2>{totalSales}</h2>
                </div>

                {/* Revenue */}
                <div style={cardStyle}>
                    <h4>💰 Revenue</h4>
                    <h2>₹{totalRevenue.toFixed(2)}</h2>
                </div>

                {/* Cost */}
                <div style={cardStyle}>
                    <h4>💸 Cost</h4>
                    <h2>₹{totalCost.toFixed(2)}</h2>
                </div>

                {/* Profit */}
                <div style={cardStyle}>
                    <h4>📈 Profit</h4>
                    <h2 style={{ color: profitColor }}>
                        ₹{totalProfit.toFixed(2)}
                    </h2>
                </div>

            </div>

            <div style={{ marginBottom: "20px" }}>
                {["all", "today", "week", "month"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            marginRight: "10px",
                            padding: "8px 15px",
                            borderRadius: "8px",
                            border: "none",
                            cursor: "pointer",
                            background: filter === f ? "#2563eb" : "#e5e7eb",
                            color: filter === f ? "#fff" : "#000"
                        }}
                    >
                        {f.toUpperCase()}
                    </button>
                ))}
            </div>

            <div style={cardStyle}>
                <h4>📊 Sales Trend</h4>
                <div style={{ display: "flex", alignItems: "flex-end", height: "150px", gap: "5px" }}>
                    {filteredSales.slice(-10).map((s, i) => (
                        <div
                            key={i}
                            style={{
                                width: "20px",
                                height: `${(s.sellingPrice || 0) / 10}px`,
                                background: "#3b82f6",
                                borderRadius: "4px"
                            }}
                            title={`₹${s.sellingPrice}`}
                        />
                    ))}
                </div>
            </div>

            <div style={{ ...cardStyle, marginTop: "20px", textAlign: "left" }}>
                <h4>🧾 Recent Sales</h4>

                <table style={{ width: "100%", marginTop: "10px" }}>
                    <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                            <th>Item</th>
                            <th>Sell</th>
                            <th>Cost</th>
                            <th>Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.slice(0, 5).map((s, i) => {
                            const profit = (s.sellingPrice || 0) - (s.buyingPrice || 0);
                            return (
                                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                                    <td>{s.itemName || "N/A"}</td>
                                    <td>₹{s.sellingPrice}</td>
                                    <td>₹{s.buyingPrice}</td>
                                    <td style={{ color: profit >= 0 ? "green" : "red" }}>
                                        ₹{profit}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// 🔹 Reusable Card Style
const cardStyle = {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    textAlign: "center"
};

export default Dashboard;