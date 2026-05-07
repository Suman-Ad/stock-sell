import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";
import SellProduct from "./SellProduct";
import { useNavigate } from "react-router-dom";
import "../assets/Dashboard.css";


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
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [selectedUser, setSelectedUser] = useState("all");

    const userList = [
        ...new Map(
            [...sales, ...stocks]
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
            setSales(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        });

        return () => unsubscribe();
    }, [role]);

    useEffect(() => {
        if (!auth.currentUser || !role) return;

        let q;

        if (role === "admin" || role === "superadmin") {
            q = collection(db, "stocks");
        } else {
            q = query(
                collection(db, "stocks"),
                where("userId", "==", auth.currentUser.uid)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStocks(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        });

        return () => unsubscribe();
    }, [role]);

    const totalStockItems = stocks.length;

    let totalStockQty = 0;
    let totalStockValue = 0;
    let totalStockExtraCost = 0;
    let totalSellingValue = 0;
    let totalExpectedProfit = 0;

    stocks
        .filter((item) => {
            if (
                (role === "admin" || role === "superadmin") &&
                selectedUser !== "all"
            ) {
                return item.userId === selectedUser;
            }

            return true;
        })
        .forEach((item) => {

            const sizes = Array.isArray(item.sizes)
                ? item.sizes
                : Object.values(item.sizes || {});

            sizes.forEach((s) => {

                const qty = Number(s?.qty || 0);
                const buying = Number(s?.buyingPrice || 0);
                const margin = Number(s?.margin || 0);
                const selling = Number(s?.sellingPrice || 0);
                const gstPercent = Number(s?.extraCosts?.gst || 0);

                const sellingWithoutGST =
                    selling / (1 + gstPercent / 100);

                const extra =
                    Number(s?.extraCosts?.packaging || 0) +
                    Number(s?.extraCosts?.labeling || 0) +
                    Number(s?.extraCosts?.rto || 0) +
                    Number(s?.extraCosts?.returnCost || 0) +
                    Number(s?.extraCosts?.advertisementCost || 0) +
                    Number(s?.extraCosts?.delivery || 0) +
                    Number(s?.extraCosts?.others || 0);

                totalStockQty += qty;

                totalStockValue += qty * buying;

                totalStockExtraCost += qty * extra;

                totalSellingValue += qty * selling;

                totalExpectedProfit += qty * (
                    (buying * margin) / 100
                );
            });
        });

    // Filter Salse
    const [filter, setFilter] = useState("all");

    const filterSales = () => {
        const now = new Date();

        return sales.filter((s) => {

            // ✅ User filter
            if (
                (role === "admin" || role === "superadmin") &&
                selectedUser !== "all" &&
                s.userId !== selectedUser
            ) {
                return false;
            }

            const saleDate = getDate(s.soldAt);

            if (!saleDate || isNaN(saleDate.getTime())) return false;

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

    const totalExtraCost = filteredSales.reduce(
        (sum, s) => sum + (s.extra || 0),
        0
    );

    const totalProfit = filteredSales.reduce(
        (sum, s) => sum + (s.profit || 0),
        0
    );

    const profitColor = totalProfit >= 0 ? "#16a34a" : "#dc2626";

    const getDailyProfit = () => {
        const map = {};

        filteredSales.forEach((s) => {
            const date = getDate(s.soldAt);
            if (!date) return;

            const key = date.toISOString().split("T")[0];

            const profit = (s.sellingPrice || 0) - (s.buyingPrice || 0);

            map[key] = (map[key] || 0) + profit;
        });

        return Object.entries(map)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .slice(-7); // last 7 days
    };

    const dailyProfitData = getDailyProfit();

    const getTopProducts = () => {
        const map = {};

        filteredSales.forEach((s) => {
            const name = s.productName || "Unknown";
            map[name] = (map[name] || 0) + 1;
        });

        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    return (
        <div className="dashboard-container">

            {/* 🔹 Welcome Section */}
            <div className="dashboard-card welcome-card" >
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

            <div style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: "15px",
                width: "100%"
            }}>
                <div className="dashboard-actions" >
                    <button className="summary-card btn danger" onClick={() => navigate("/sell-product")}>
                        <strong style={{ fontSize: "20px" }}>📷 Scan Product</strong>
                    </button>
                    <p className="summary-card" onClick={() => navigate("/stock-list")}
                        style={{ cursor: "pointer" }}>Stock Inventory</p>

                    <p className="summary-card" onClick={() => navigate("/sales-history")}
                        style={{ cursor: "pointer" }}>Sales History</p>
                    {(user?.role === "superadmin" || user?.role === "admin") &&
                        (
                            <p className="summary-card btn primary" onClick={() => navigate("/admin")}
                                style={{ cursor: "pointer" }}>Admin</p>
                        )}
                </div>
                {/* 👤 User Filter */}
                {(role === "admin" || role === "superadmin") && (
                    <div style={{ marginBottom: "15px" }}>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            style={{
                                padding: "10px",
                                borderRadius: "8px",
                                border: "1px solid #ccc",
                                flex: "1 1 220px",
                                minWidth: "0",
                                maxWidth: "80%"
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
            </div>



            {/* 🔹 Stats Cards */}
            <div className="dashboard-grid" >

                {/* Total Sales */}
                <div className="stat-card blue">
                    <h4>📦 Total Sales</h4>
                    <h2>{totalSales}</h2>
                </div>

                {/* Revenue */}
                <div className="stat-card green">
                    <h4>💰 Revenue</h4>
                    <h2>₹{totalRevenue.toFixed(2)}</h2>
                </div>

                {/* Cost */}
                <div className="stat-card orange">
                    <h4>💸 Cost</h4>
                    <h2>₹{(totalCost + totalExtraCost).toFixed(2)}</h2>
                </div>

                {/* Profit */}
                <div className="stat-card red">
                    <h4>📈 Profit</h4>
                    <h2 style={{ color: profitColor }}>
                        ₹{totalProfit.toFixed(2)}
                    </h2>
                </div>

                {/* Stock Items */}
                <div className="stat-card blue">
                    <h4>📦 Stock Available</h4>
                    <h2>{totalStockQty.toFixed(2)}</h2>
                </div>

                {/* Stock Value */}
                <div className="stat-card orange">
                    <h4>💼 Stock Investment</h4>
                    <h2>₹{totalStockValue.toFixed(2)}</h2>
                </div>

                {/* Stock Extra Cost */}
                <div className="stat-card red">
                    <h4>📦 Extra Cost</h4>
                    <h2>₹{totalStockExtraCost.toFixed(2)}</h2>
                </div>

                {/* Stock Sellinng value */}
                <div className="stat-card green">
                    <h4>💰 Stock Selling Value</h4>
                    <h2>₹{totalSellingValue.toFixed(2)}</h2>
                </div>

                {/* Expected Profit */}
                <div className={`stat-card ${totalExpectedProfit >= 0 ? "green" : "red"}`}>
                    <h4>📈 Expected Profit</h4>
                    <h2>
                        ₹{totalExpectedProfit.toFixed(2)}
                    </h2>
                </div>
            </div>

            <div className="filter-bar">
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

            <div className="dashboard-card" >
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
            <div className="dashboard-card" >
                {dailyProfitData.map(([date, profit], i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: "30px",
                                height: `${Math.max(profit / 10, 5)}px`,
                                background: profit >= 0 ? "#16a34a" : "#dc2626",
                                borderRadius: "4px"
                            }}
                            title={`${date} → ₹${profit}`}
                        />
                        <div style={{ fontSize: "10px", marginTop: "4px" }}>
                            {date.slice(5)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-card" >
                <h4>🔥 Top Products</h4>
                {getTopProducts().map(([name, count], i) => (
                    <p key={i}>{name} - {count} sold</p>
                ))}
            </div>

            <div className="dashboard-table">
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
                            const profit = (s.profit || 0);
                            return (
                                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                                    <td>{s.productName || "N/A"}</td>
                                    <td>₹{(s.sellingPrice).toFixed(2)}</td>
                                    <td>₹{(s.buyingPrice + s.extra).toFixed(2)}</td>
                                    <td style={{ color: profit >= 0 ? "green" : "red" }}>
                                        ₹{profit.toFixed(2)}
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

export default Dashboard;