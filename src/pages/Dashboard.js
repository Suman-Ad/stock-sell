import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";
import SellProduct from "./SellProduct";
import { useNavigate } from "react-router-dom";
import "../assets/Dashboard.css";
import FeatureGate from "../components/FeatureGate";


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
    const [trendMode, setTrendMode] = useState("daily");
    const [trendMetric, setTrendMetric] = useState("revenue");

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

    const filteredStocks = stocks.filter(item => {

        // 🔥 User filter
        if (
            (role === "admin" || role === "superadmin") &&
            selectedUser !== "all" &&
            item.userId !== selectedUser
        ) {
            return false;
        }

        return true;
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

            const catalogId =
                s.catalogId || "Unknown";

            const status =
                (s.orderStatus || "pending")
                    .toLowerCase();

            if (!map[catalogId]) {

                map[catalogId] = {
                    name: s.productName || "Unknown",

                    sold: 0,
                    delivered: 0,
                    shipped: 0,
                    cancelled: 0,
                    rto: 0,
                    pending: 0
                };
            }

            map[catalogId].sold += 1;

            // STATUS COUNTS
            if (status.includes("deliver")) {

                map[catalogId].delivered += 1;
            }

            else if (status.includes("ship")) {

                map[catalogId].shipped += 1;
            }

            else if (
                status.includes("rto") ||
                status.includes("return")
            ) {

                map[catalogId].rto += 1;
            }

            else if (
                status.includes("cancel")
            ) {

                map[catalogId].cancelled += 1;
            }

            else {

                map[catalogId].pending += 1;
            }
        });

        return Object.entries(map)
            .map(([catalogId, data]) => ({

                catalogId,

                ...data,

                successRate:
                    data.sold > 0
                        ? (
                            (data.delivered /
                                data.sold) * 100
                        ).toFixed(1)
                        : 0
            }))
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 10);
    };

    const getSalesTrendData = () => {
        const map = {};

        filteredSales.forEach((s) => {
            const date = getDate(s.soldAt);
            if (!date) return;

            const key = date.toISOString().split("T")[0];

            map[key] =
                (map[key] || 0) +
                Number(s.sellingPrice || 0);
        });

        return Object.entries(map)
            .sort((a, b) => new Date(a[0]) - new Date(b[0]))
            .slice(-7)
            .map(([date, value]) => ({
                date,
                short: date.slice(5),
                value
            }));
    };

    const salesTrendData = getSalesTrendData();

    const totalTrendRevenue =
        salesTrendData.reduce((a, b) => a + b.value, 0);

    const avgTrendRevenue =
        salesTrendData.length > 0
            ? totalTrendRevenue / salesTrendData.length
            : 0;

    const peakDay =
        salesTrendData.length > 0
            ? salesTrendData.reduce((max, item) =>
                item.value > max.value ? item : max
            )
            : null;

    const growth =
        salesTrendData.length >= 2
            ? (
                (
                    salesTrendData[salesTrendData.length - 1].value -
                    salesTrendData[0].value
                ) /
                Math.max(salesTrendData[0].value, 1)
            ) * 100
            : 0;

    const getAdvancedTrendData = () => {

        const map = {};

        filteredSales.forEach((s) => {

            const date = getDate(s.soldAt);

            if (!date) return;

            let key = "";

            // DAILY
            if (trendMode === "daily") {

                key = date.toISOString().split("T")[0];
            }

            // MONTHLY
            else if (trendMode === "monthly") {

                key =
                    `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                    ).padStart(2, "0")}`;
            }

            // YEARLY
            else {

                key = `${date.getFullYear()}`;
            }

            if (!map[key]) {

                map[key] = {
                    revenue: 0,
                    qty: 0,
                    orders: 0,
                    profit: 0
                };
            }

            map[key].revenue += Number(s.sellingPrice || 0);

            map[key].qty += Number(s.qty || 1);

            map[key].orders += 1;

            map[key].profit += Number(s.profit || 0);
        });

        let data = Object.entries(map)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, values]) => ({
                date,
                short:
                    trendMode === "daily"
                        ? date.slice(5)
                        : date,
                ...values
            }));

        // 🔥 AUTO LIMIT DAILY DATA
        if (trendMode === "daily" && data.length > 30) {

            data = data.slice(-30);
        }

        return data;
    };

    const trendData = getAdvancedTrendData();

    const totalMetric = trendData.reduce(
        (sum, item) =>
            sum + Number(item[trendMetric] || 0),
        0
    );

    const avgMetric =
        trendData.length > 0
            ? totalMetric / trendData.length
            : 0;

    const peakMetric =
        trendData.length > 0
            ? trendData.reduce((max, item) =>
                item[trendMetric] > max[trendMetric]
                    ? item
                    : max
            )
            : null;

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
                // display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: "15px",
                width: "100%"
            }}>
                <div className="dashboard-actions" >
                    <FeatureGate
                        user={user}
                        feature="scan"
                        title="Scanner"
                        description="Upgrade your plan to unlock QR mobile product scanning."
                    >
                        <button className="summary-card" style={{ background: "#6bd7ebb2" }} onClick={() => navigate("/sell-product")}>
                            <img src="/gemini-svg.svg" alt="Scan QR" />

                            <strong style={{ fontSize: "20px" }}>
                                Scan Product
                            </strong>
                        </button>

                    </FeatureGate>

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
                    <div>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            style={{
                                padding: "10px",
                                borderRadius: "8px",
                                flex: "1 1 220px",
                                minWidth: "0",
                                maxWidth: "100%",
                                border: "1px solid #3b82f6",
                                outline: "none",
                                background: "#1e293b",
                                color: "#fff",
                                width: "80%",
                                cursor: "pointer",
                                transform: "translateY(-3px)",
                                boxShadow: "0 6px 20px rgba(59,130,246,0.25)",
                                transition: "all 0.2s ease"
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

            <FeatureGate
                user={user}
                feature="analytics"
                title="Dashboard Analytics"
                description="Upgrade your plan to unlock analytics."
            >

                {/* OVERVIEW */}
                <div
                    style={{
                        marginTop: "20px",
                        marginBottom: "25px"
                    }}
                >

                    {/* HEADER */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "15px",
                            marginBottom: "20px"
                        }}
                    >

                        <div>

                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: "34px",
                                    fontWeight: "800",
                                    color: "#fcfcfc"
                                }}
                            >
                                📊 Business Overview
                            </h1>

                            <p
                                style={{
                                    marginTop: "6px",
                                    color: "#64748b",
                                    fontSize: "15px"
                                }}
                            >
                                Revenue, inventory & profitability insights
                            </p>
                        </div>

                        {/* STATUS */}
                        <div
                            style={{
                                background:
                                    totalProfit >= 0
                                        ? "rgba(34,197,94,0.12)"
                                        : "rgba(239,68,68,0.12)",
                                color:
                                    totalProfit >= 0
                                        ? "#16a34a"
                                        : "#dc2626",
                                padding: "12px 18px",
                                borderRadius: "16px",
                                fontWeight: "700",
                                border:
                                    totalProfit >= 0
                                        ? "1px solid rgba(34,197,94,0.25)"
                                        : "1px solid rgba(239,68,68,0.25)"
                            }}
                        >
                            {totalProfit >= 0
                                ? "▲ Profitable"
                                : "▼ Loss Running"}
                        </div>
                    </div>

                    {/* GRID */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(240px,1fr))",
                            gap: "20px",
                        }}
                    >

                        {[
                            {
                                title: "Total Sales",
                                value: totalSales,
                                icon: "📦",
                                color: "#3b82f6",
                                bg: "linear-gradient(135deg,#2563eb,#3b82f6)"
                            },

                            {
                                title: "Revenue",
                                value: `₹${totalRevenue.toFixed(0)}`,
                                icon: "💰",
                                color: "#22c55e",
                                bg: "linear-gradient(135deg,#16a34a,#22c55e)"
                            },

                            {
                                title: "Total Cost",
                                value: `₹${(
                                    totalCost +
                                    totalExtraCost
                                ).toFixed(0)}`,
                                icon: "💸",
                                color: "#f97316",
                                bg: "linear-gradient(135deg,#ea580c,#fb923c)"
                            },

                            {
                                title: "Net Profit",
                                value: `₹${totalProfit.toFixed(0)}`,
                                icon: "📈",
                                color:
                                    totalProfit >= 0
                                        ? "#22c55e"
                                        : "#ef4444",
                                bg:
                                    totalProfit >= 0
                                        ? "linear-gradient(135deg,#16a34a,#4ade80)"
                                        : "linear-gradient(135deg,#dc2626,#f87171)"
                            },

                            {
                                title: "Stock Catalogues",
                                value: filteredStocks.length,
                                subtitle: `${totalStockQty} units`,
                                icon: "🏷",
                                color: "#06b6d4",
                                bg: "linear-gradient(135deg,#0891b2,#06b6d4)"
                            },

                            {
                                title: "Inventory Investment",
                                value: `₹${totalStockValue.toFixed(0)}`,
                                icon: "🏭",
                                color: "#8b5cf6",
                                bg: "linear-gradient(135deg,#7c3aed,#8b5cf6)"
                            },

                            {
                                title: "Extra Expenses",
                                value: `₹${totalStockExtraCost.toFixed(0)}`,
                                icon: "🧾",
                                color: "#ef4444",
                                bg: "linear-gradient(135deg,#dc2626,#ef4444)"
                            },

                            {
                                title: "Stock Selling Value",
                                value: `₹${totalSellingValue.toFixed(0)}`,
                                icon: "🛒",
                                color: "#14b8a6",
                                bg: "linear-gradient(135deg,#0f766e,#14b8a6)"
                            },

                            {
                                title: "Expected Profit",
                                value: `₹${totalExpectedProfit.toFixed(0)}`,
                                icon: "🚀",
                                color:
                                    totalExpectedProfit >= 0
                                        ? "#22c55e"
                                        : "#ef4444",
                                bg:
                                    totalExpectedProfit >= 0
                                        ? "linear-gradient(135deg,#16a34a,#4ade80)"
                                        : "linear-gradient(135deg,#dc2626,#f87171)"
                            }
                        ].map((card, i) => (

                            <div
                                key={i}
                                style={{
                                    position: "relative",
                                    overflow: "hidden",
                                    borderRadius: "28px",
                                    padding: "24px",
                                    background: "#0f172a",
                                    boxShadow:
                                        "0 10px 30px rgba(0,0,0,0.08)",
                                    transition:
                                        "all 0.3s ease",
                                    cursor: "pointer"
                                }}
                            >

                                {/* TOP GLOW */}
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "-60px",
                                        right: "-60px",
                                        width: "140px",
                                        height: "140px",
                                        borderRadius: "50%",
                                        background: card.bg,
                                        opacity: 0.15,
                                        filter: "blur(20px)"
                                    }}
                                />

                                {/* ICON */}
                                <div
                                    style={{
                                        width: "58px",
                                        height: "58px",
                                        borderRadius: "18px",
                                        background: card.bg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "28px",
                                        marginBottom: "18px",
                                        boxShadow:
                                            "0 10px 25px rgba(0,0,0,0.12)"
                                    }}
                                >
                                    {card.icon}
                                </div>

                                {/* TITLE */}
                                <p
                                    style={{
                                        margin: 0,
                                        color: "#64748b",
                                        fontSize: "14px",
                                        fontWeight: "600"
                                    }}
                                >
                                    {card.title}
                                </p>

                                {/* VALUE */}
                                <h2
                                    style={{
                                        margin:
                                            "12px 0 8px",
                                        fontSize: "34px",
                                        fontWeight: "800",
                                        color: "#ffffff",
                                        lineHeight: 1.1
                                    }}
                                >
                                    {card.value}
                                </h2>

                                {/* SUBTITLE */}
                                {card.subtitle && (

                                    <div
                                        style={{
                                            color: "#94a3b8",
                                            fontSize: "13px",
                                            fontWeight: "600"
                                        }}
                                    >
                                        {card.subtitle}
                                    </div>
                                )}

                                {/* FOOTER TREND */}
                                <div
                                    style={{
                                        marginTop: "18px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}
                                >

                                    <div
                                        style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            background:
                                                card.color
                                        }}
                                    />

                                    <small
                                        style={{
                                            color: "#64748b",
                                            fontWeight: "600"
                                        }}
                                    >
                                        Live analytics data
                                    </small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </FeatureGate>


            <div
                className="dashboard-card"
                style={{
                    padding: "25px",
                    borderRadius: "28px",
                    background:
                        "linear-gradient(135deg,#020617 0%, #0f172a 40%, #1e3a8a 100%)",
                    color: "#fff",
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: "0 20px 50px rgba(224, 23, 23, 0.35)",
                    marginTop: "15px"
                }}
            >

                {/* TOP */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "15px",
                        marginBottom: "25px"
                    }}
                >

                    {/* LEFT */}
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "30px",
                                fontWeight: "800"
                            }}
                        >
                            📊 Sales Intelligence
                        </h2>

                        <p
                            style={{
                                color: "#94a3b8",
                                marginTop: "5px"
                            }}
                        >
                            Revenue • Orders • Quantity • Profit
                        </p>
                    </div>

                    {/* CONTROLS */}
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap"
                        }}
                    >

                        {/* RANGE */}
                        <select
                            value={trendMode}
                            onChange={(e) =>
                                setTrendMode(e.target.value)
                            }
                            style={{
                                padding: "10px 14px",
                                borderRadius: "12px",
                                border: "1px solid #334155",
                                background: "#0f172a",
                                color: "#fff",
                                fontWeight: "600"
                            }}
                        >
                            <option value="daily">Daily</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>

                        {/* METRIC */}
                        <select
                            value={trendMetric}
                            onChange={(e) =>
                                setTrendMetric(e.target.value)
                            }
                            style={{
                                padding: "10px 14px",
                                borderRadius: "12px",
                                border: "1px solid #334155",
                                background: "#0f172a",
                                color: "#fff",
                                fontWeight: "600"
                            }}
                        >
                            <option value="revenue">Revenue</option>
                            <option value="orders">Orders</option>
                            <option value="qty">Qty Sold</option>
                            <option value="profit">Profit</option>
                        </select>
                    </div>
                </div>

                {/* SUMMARY */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit,minmax(180px,1fr))",
                        gap: "15px",
                        marginBottom: "30px"
                    }}
                >

                    <div
                        style={{
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: "18px",
                            padding: "18px"
                        }}
                    >
                        <p style={{ color: "#94a3b8", margin: 0 }}>
                            Total {trendMetric}
                        </p>

                        <h2 style={{ marginTop: "10px" }}>
                            {trendMetric === "revenue" ||
                                trendMetric === "profit"
                                ? `₹${totalMetric.toFixed(0)}`
                                : totalMetric.toFixed(0)}
                        </h2>
                    </div>

                    <div
                        style={{
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: "18px",
                            padding: "18px"
                        }}
                    >
                        <p style={{ color: "#94a3b8", margin: 0 }}>
                            Average
                        </p>

                        <h2 style={{ marginTop: "10px" }}>
                            {trendMetric === "revenue" ||
                                trendMetric === "profit"
                                ? `₹${avgMetric.toFixed(0)}`
                                : avgMetric.toFixed(0)}
                        </h2>
                    </div>

                    <div
                        style={{
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: "18px",
                            padding: "18px"
                        }}
                    >
                        <p style={{ color: "#94a3b8", margin: 0 }}>
                            Peak Period
                        </p>

                        <h2 style={{ marginTop: "10px" }}>
                            {peakMetric?.short || "--"}
                        </h2>

                        <small style={{ color: "#60a5fa" }}>
                            {trendMetric === "revenue" ||
                                trendMetric === "profit"
                                ? `₹${peakMetric?.[trendMetric]?.toFixed(0) || 0}`
                                : peakMetric?.[trendMetric]?.toFixed(0) || 0}
                        </small>
                    </div>
                </div>

                {/* CHART */}
                <div
                    style={{
                        width: "100%",
                        overflowX: "auto",
                        overflowY: "hidden",
                        paddingBottom: "10px"
                    }}
                >
                    <svg
                        width={
                            trendMode === "daily"
                                ? Math.max(trendData.length * 90, 950)
                                : "100%"
                        }
                        height="320"
                        viewBox={`0 0 ${trendMode === "daily"
                            ? Math.max(trendData.length * 90, 950)
                            : 950
                            } 320`}
                    >

                        {/* GRID */}
                        {[0, 1, 2, 3, 4].map((g) => (
                            <line
                                key={g}
                                x1="60"
                                y1={50 + g * 50}
                                x2="900"
                                y2={50 + g * 50}
                                stroke="rgba(255,255,255,0.08)"
                                strokeDasharray="5"
                            />
                        ))}

                        {(() => {

                            const max = Math.max(
                                ...trendData.map(
                                    (d) => Number(d[trendMetric] || 0)
                                ),
                                1
                            );

                            const chartWidth =
                                trendMode === "daily"
                                    ? Math.max(
                                        trendData.length * 90,
                                        950
                                    )
                                    : 950;

                            // 🔥 Y AXIS SCALE
                            const ySteps = 5;

                            const yScale = Array.from(
                                { length: ySteps + 1 },
                                (_, i) => {

                                    const value =
                                        max -
                                        (max / ySteps) * i;

                                    const y =
                                        50 + (200 / ySteps) * i;

                                    return {
                                        value,
                                        y
                                    };
                                }
                            );

                            const points = trendData.map(
                                (d, i) => {

                                    const x =
                                        (i /
                                            Math.max(
                                                trendData.length - 1,
                                                1
                                            )) *
                                        (chartWidth - 180) +
                                        90;

                                    const y =
                                        250 -
                                        (
                                            Number(
                                                d[trendMetric] || 0
                                            ) / max
                                        ) *
                                        170;

                                    return {
                                        ...d,
                                        x,
                                        y
                                    };
                                }
                            );

                            const path = points
                                .map((p, i) =>
                                    `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
                                )
                                .join(" ");

                            const area =
                                `${path}
        L ${points[points.length - 1]?.x || 0} 250
        L ${points[0]?.x || 0} 250 Z`;

                            return (
                                <>
                                    {/* 🔥 GRID + Y SCALE */}
                                    {yScale.map((s, i) => (

                                        <g key={i}>

                                            {/* GRID */}
                                            <line
                                                x1="90"
                                                y1={s.y}
                                                x2={chartWidth - 40}
                                                y2={s.y}
                                                stroke="rgba(255,255,255,0.08)"
                                                strokeDasharray="5"
                                            />

                                            {/* Y LABEL */}
                                            <text
                                                x="80"
                                                y={s.y + 4}
                                                textAnchor="end"
                                                fill="#94a3b8"
                                                fontSize="11"
                                                fontWeight="600"
                                            >
                                                {
                                                    trendMetric === "revenue" ||
                                                        trendMetric === "profit"
                                                        ? `₹${Math.round(s.value)}`
                                                        : Math.round(s.value)
                                                }
                                            </text>
                                        </g>
                                    ))}

                                    {/* AXIS */}
                                    <line
                                        x1="90"
                                        y1="50"
                                        x2="90"
                                        y2="250"
                                        stroke="rgba(255,255,255,0.2)"
                                    />

                                    <line
                                        x1="90"
                                        y1="250"
                                        x2={chartWidth - 40}
                                        y2="250"
                                        stroke="rgba(255,255,255,0.2)"
                                    />

                                    {/* AREA */}
                                    <path
                                        d={area}
                                        fill="url(#chartGradient)"
                                    />

                                    {/* GLOW */}
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke="#3b82f655"
                                        strokeWidth="14"
                                        strokeLinecap="round"
                                    />

                                    {/* MAIN LINE */}
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke="#60a5fa"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* POINTS */}
                                    {points.map((p, i) => (

                                        <g key={i}>

                                            {/* POINT */}
                                            <circle
                                                cx={p.x}
                                                cy={p.y}
                                                r="7"
                                                fill="#fff"
                                                stroke="#3b82f6"
                                                strokeWidth="4"
                                            />

                                            {/* VALUE */}
                                            {(
                                                trendMode !== "daily" ||
                                                trendData.length <= 15 ||
                                                i % 2 === 0
                                            ) && (
                                                    <text
                                                        x={p.x}
                                                        y={p.y - 16}
                                                        fill="#fff"
                                                        fontSize="11"
                                                        fontWeight="700"
                                                        textAnchor="middle"
                                                    >
                                                        {
                                                            trendMetric ===
                                                                "revenue" ||
                                                                trendMetric ===
                                                                "profit"
                                                                ? `₹${Math.round(
                                                                    p[
                                                                    trendMetric
                                                                    ]
                                                                )}`
                                                                : Math.round(
                                                                    p[
                                                                    trendMetric
                                                                    ]
                                                                )
                                                        }
                                                    </text>
                                                )}

                                            {/* DATE */}
                                            <text
                                                x={p.x}
                                                y="285"
                                                transform={
                                                    trendMode === "daily"
                                                        ? `rotate(-35 ${p.x} 285)`
                                                        : ""
                                                }
                                                fill="#cbd5e1"
                                                fontSize="11"
                                                textAnchor="middle"
                                            >
                                                {p.short}
                                            </text>
                                        </g>
                                    ))}
                                </>
                            );
                        })()}

                        <defs>
                            <linearGradient
                                id="chartGradient"
                                x1="0"
                                x2="0"
                                y1="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#3b82f6"
                                    stopOpacity="0.45"
                                />

                                <stop
                                    offset="100%"
                                    stopColor="#3b82f6"
                                    stopOpacity="0"
                                />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>

            <div
                className="dashboard-card"
                style={{
                    marginTop: "20px",
                    padding: "25px",
                    borderRadius: "28px",
                    background:
                        "linear-gradient(135deg,#111827 0%, #0f172a 50%, #1e293b 100%)",
                    color: "#fff",
                    overflow: "hidden",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
                }}
            >

                {/* HEADER */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "15px",
                        marginBottom: "25px"
                    }}
                >

                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "28px",
                                fontWeight: "800"
                            }}
                        >
                            📈 Daily Profit Insights
                        </h2>

                        <p
                            style={{
                                marginTop: "5px",
                                color: "#94a3b8"
                            }}
                        >
                            Last 7 days profit performance
                        </p>
                    </div>

                    {/* SUMMARY */}
                    <div
                        style={{
                            display: "flex",
                            gap: "12px",
                            flexWrap: "wrap"
                        }}
                    >

                        {/* TOTAL */}
                        <div
                            style={{
                                background:
                                    "rgba(255,255,255,0.06)",
                                padding: "12px 16px",
                                borderRadius: "16px"
                            }}
                        >
                            <small
                                style={{
                                    color: "#94a3b8"
                                }}
                            >
                                Total Profit
                            </small>

                            <h3
                                style={{
                                    margin: "5px 0 0",
                                    color: "#4ade80"
                                }}
                            >
                                ₹{
                                    dailyProfitData
                                        .reduce(
                                            (a, b) => a + b[1],
                                            0
                                        )
                                        .toFixed(0)
                                }
                            </h3>
                        </div>

                        {/* AVG */}
                        <div
                            style={{
                                background:
                                    "rgba(255,255,255,0.06)",
                                padding: "12px 16px",
                                borderRadius: "16px"
                            }}
                        >
                            <small
                                style={{
                                    color: "#94a3b8"
                                }}
                            >
                                Avg Daily
                            </small>

                            <h3
                                style={{
                                    margin: "5px 0 0",
                                    color: "#60a5fa"
                                }}
                            >
                                ₹{
                                    (
                                        dailyProfitData.reduce(
                                            (a, b) => a + b[1],
                                            0
                                        ) /
                                        Math.max(
                                            dailyProfitData.length,
                                            1
                                        )
                                    ).toFixed(0)
                                }
                            </h3>
                        </div>
                    </div>
                </div>

                {/* CHART */}
                <div
                    style={{
                        width: "100%",
                        overflowX: "auto",
                        paddingBottom: "10px"
                    }}
                >

                    {(() => {

                        const max = Math.max(
                            ...dailyProfitData.map(
                                ([, profit]) =>
                                    Math.abs(profit)
                            ),
                            1
                        );

                        return (

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-end",
                                    gap: "22px",
                                    minWidth: "700px",
                                    height: "320px",
                                    padding: "20px 20px 45px",
                                    position: "relative"
                                }}
                            >

                                {/* Y GRID */}
                                {[0, 1, 2, 3, 4].map((g) => (

                                    <div
                                        key={g}
                                        style={{
                                            position: "absolute",
                                            left: "0",
                                            right: "0",
                                            bottom:
                                                45 +
                                                g * 55,
                                            borderTop:
                                                "1px dashed rgba(255,255,255,0.08)"
                                        }}
                                    />
                                ))}

                                {/* BARS */}
                                {dailyProfitData.map(
                                    ([date, profit], i) => {

                                        const barHeight =
                                            (
                                                Math.abs(profit) /
                                                max
                                            ) * 220;

                                        const positive =
                                            profit >= 0;

                                        return (

                                            <div
                                                key={i}
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    flex: 1,
                                                    minWidth: "70px",
                                                    position: "relative"
                                                }}
                                            >

                                                {/* VALUE */}
                                                <div
                                                    style={{
                                                        marginBottom: "10px",
                                                        fontSize: "12px",
                                                        fontWeight: "700",
                                                        color:
                                                            positive
                                                                ? "#4ade80"
                                                                : "#f87171"
                                                    }}
                                                >
                                                    ₹{profit.toFixed(0)}
                                                </div>

                                                {/* BAR */}
                                                <div
                                                    title={`${date} → ₹${profit}`}
                                                    style={{
                                                        width: "42px",
                                                        height: `${Math.max(
                                                            barHeight,
                                                            10
                                                        )}px`,
                                                        borderRadius:
                                                            "14px 14px 6px 6px",
                                                        background:
                                                            positive
                                                                ? "linear-gradient(180deg,#22c55e,#16a34a)"
                                                                : "linear-gradient(180deg,#ef4444,#dc2626)",
                                                        boxShadow:
                                                            positive
                                                                ? "0 10px 25px rgba(34,197,94,0.35)"
                                                                : "0 10px 25px rgba(239,68,68,0.35)",
                                                        transition:
                                                            "all 0.3s ease"
                                                    }}
                                                />

                                                {/* DATE */}
                                                <div
                                                    style={{
                                                        marginTop: "12px",
                                                        fontSize: "11px",
                                                        color: "#cbd5e1",
                                                        transform:
                                                            "rotate(-30deg)"
                                                    }}
                                                >
                                                    {date.slice(5)}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div
                className="dashboard-card"
                style={{
                    marginTop: "20px",
                    borderRadius: "24px",
                    overflow: "hidden",
                    padding: "0",
                    background:
                        "linear-gradient(135deg,#0f172a,#111827)"
                }}
            >

                {/* HEADER */}
                <div
                    style={{
                        padding: "20px 25px",
                        borderBottom:
                            "1px solid rgba(255,255,255,0.08)"
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            color: "#fff",
                            fontSize: "24px"
                        }}
                    >
                        🔥 Top Products Analytics
                    </h3>

                    <p
                        style={{
                            marginTop: "6px",
                            color: "#94a3b8"
                        }}
                    >
                        Product performance with order status tracking
                    </p>
                </div>

                {/* LIST */}
                <div
                    style={{
                        padding: "20px"
                    }}
                >

                    {getTopProducts().map((item, i) => (

                        <div
                            key={i}
                            style={{
                                background:
                                    "rgba(255,255,255,0.04)",
                                border:
                                    "1px solid rgba(255,255,255,0.06)",
                                borderRadius: "20px",
                                padding: "18px",
                                marginBottom: "16px"
                            }}
                        >

                            {/* TOP ROW */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "15px",
                                    flexWrap: "wrap"
                                }}
                            >

                                {/* LEFT */}
                                <div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            flexWrap: "wrap"
                                        }}
                                    >

                                        <div
                                            style={{
                                                width: "35px",
                                                height: "35px",
                                                borderRadius: "50%",
                                                background:
                                                    "linear-gradient(135deg,#3b82f6,#06b6d4)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#fff",
                                                fontWeight: "700"
                                            }}
                                        >
                                            #{i + 1}
                                        </div>

                                        <div>

                                            <h4
                                                style={{
                                                    margin: 0,
                                                    color: "#fff"
                                                }}
                                            >
                                                {item.catalogId}
                                            </h4>

                                            <p
                                                style={{
                                                    margin: "4px 0 0",
                                                    color: "#94a3b8",
                                                    fontSize: "14px"
                                                }}
                                            >
                                                {item.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT */}
                                <div
                                    style={{
                                        textAlign: "right"
                                    }}
                                >
                                    <h2
                                        style={{
                                            margin: 0,
                                            color: "#60a5fa"
                                        }}
                                    >
                                        {item.sold}
                                    </h2>

                                    <small
                                        style={{
                                            color: "#94a3b8"
                                        }}
                                    >
                                        Total Sold
                                    </small>
                                </div>
                            </div>

                            {/* STATUS BADGES */}
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "10px",
                                    marginTop: "18px"
                                }}
                            >

                                <div
                                    style={{
                                        background:
                                            "rgba(34,197,94,0.15)",
                                        color: "#4ade80",
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        fontSize: "13px",
                                        fontWeight: "700"
                                    }}
                                >
                                    ✅ Delivered: {item.delivered}
                                </div>

                                <div
                                    style={{
                                        background:
                                            "rgba(59,130,246,0.15)",
                                        color: "#60a5fa",
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        fontSize: "13px",
                                        fontWeight: "700"
                                    }}
                                >
                                    🚚 Shipped: {item.shipped}
                                </div>

                                <div
                                    style={{
                                        background:
                                            "rgba(239,68,68,0.15)",
                                        color: "#f87171",
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        fontSize: "13px",
                                        fontWeight: "700"
                                    }}
                                >
                                    ❌ Cancelled: {item.cancelled}
                                </div>

                                <div
                                    style={{
                                        background:
                                            "rgba(251,146,60,0.15)",
                                        color: "#fb923c",
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        fontSize: "13px",
                                        fontWeight: "700"
                                    }}
                                >
                                    🔁 RTO: {item.rto}
                                </div>

                                <div
                                    style={{
                                        background:
                                            "rgba(250,204,21,0.15)",
                                        color: "#fde047",
                                        padding: "8px 12px",
                                        borderRadius: "999px",
                                        fontSize: "13px",
                                        fontWeight: "700"
                                    }}
                                >
                                    ⏳ Pending: {item.pending}
                                </div>
                            </div>

                            {/* SUCCESS BAR */}
                            <div
                                style={{
                                    marginTop: "18px"
                                }}
                            >

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "8px"
                                    }}
                                >
                                    <small
                                        style={{
                                            color: "#94a3b8"
                                        }}
                                    >
                                        Delivery Success Rate
                                    </small>

                                    <small
                                        style={{
                                            color: "#fff",
                                            fontWeight: "700"
                                        }}
                                    >
                                        {item.successRate}%
                                    </small>
                                </div>

                                <div
                                    style={{
                                        width: "100%",
                                        height: "10px",
                                        background:
                                            "rgba(255,255,255,0.08)",
                                        borderRadius: "999px",
                                        overflow: "hidden"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${item.successRate}%`,
                                            height: "100%",
                                            background:
                                                item.successRate >= 70
                                                    ? "linear-gradient(90deg,#22c55e,#4ade80)"
                                                    : item.successRate >= 40
                                                        ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                                                        : "linear-gradient(90deg,#ef4444,#f87171)",
                                            borderRadius: "999px",
                                            transition:
                                                "all 0.4s ease"
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="dashboard-table"
                style={{
                    marginTop: "20px",
                    borderRadius: "28px",
                    overflow: "hidden",
                    background:
                        "linear-gradient(135deg,#0f172a,#111827)",
                    boxShadow:
                        "0 20px 50px rgba(0,0,0,0.25)"
                }}
            >

                {/* HEADER */}
                <div
                    style={{
                        padding: "22px 25px",
                        borderBottom:
                            "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px"
                    }}
                >

                    <div>
                        <h2
                            style={{
                                margin: 0,
                                color: "#fff",
                                fontSize: "28px",
                                fontWeight: "800"
                            }}
                        >
                            🧾 Recent Sales
                        </h2>

                        <p
                            style={{
                                marginTop: "5px",
                                color: "#94a3b8"
                            }}
                        >
                            Latest sales & order activity
                        </p>
                    </div>

                    <div
                        style={{
                            background:
                                "rgba(59,130,246,0.15)",
                            color: "#60a5fa",
                            padding: "10px 15px",
                            borderRadius: "14px",
                            fontWeight: "700"
                        }}
                    >
                        {filteredSales.length} Orders
                    </div>
                </div>

                {/* TABLE */}
                <div
                    style={{
                        overflowX: "auto"
                    }}
                >

                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: "1100px"
                        }}
                    >

                        <thead>
                            <tr
                                style={{
                                    background:
                                        "rgba(255,255,255,0.04)"
                                }}
                            >

                                {[
                                    "Product",
                                    "Catalog",
                                    "Selling",
                                    "Cost",
                                    "Profit",
                                    "Status",
                                    "Date",
                                    "Seller"
                                ].map((h, i) => (

                                    <th
                                        key={i}
                                        style={{
                                            padding: "18px",
                                            textAlign: "left",
                                            color: "#cbd5e1",
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            letterSpacing: "0.5px",
                                            borderBottom:
                                                "1px solid rgba(255,255,255,0.06)"
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>

                            {filteredSales
                                .slice(0, 10)
                                .map((s, i) => {

                                    const profit =
                                        Number(s.profit || 0);

                                    const status =
                                        (
                                            s.orderStatus ||
                                            "pending"
                                        ).toLowerCase();

                                    const getStatusStyle = () => {

                                        if (
                                            status.includes(
                                                "deliver"
                                            )
                                        ) {
                                            return {
                                                bg: "rgba(34,197,94,0.15)",
                                                color: "#4ade80",
                                                text: "Delivered"
                                            };
                                        }

                                        if (
                                            status.includes(
                                                "ship"
                                            )
                                        ) {
                                            return {
                                                bg: "rgba(59,130,246,0.15)",
                                                color: "#60a5fa",
                                                text: "Shipped"
                                            };
                                        }

                                        if (
                                            status.includes(
                                                "cancel"
                                            )
                                        ) {
                                            return {
                                                bg: "rgba(239,68,68,0.15)",
                                                color: "#f87171",
                                                text: "Cancelled"
                                            };
                                        }

                                        if (
                                            status.includes(
                                                "rto"
                                            )
                                        ) {
                                            return {
                                                bg: "rgba(249,115,22,0.15)",
                                                color: "#fb923c",
                                                text: "RTO"
                                            };
                                        }

                                        return {
                                            bg: "rgba(250,204,21,0.15)",
                                            color: "#fde047",
                                            text: "Pending"
                                        };
                                    };

                                    const statusStyle =
                                        getStatusStyle();

                                    return (

                                        <tr
                                            key={i}
                                            style={{
                                                borderBottom:
                                                    "1px solid rgba(255,255,255,0.05)",
                                                transition:
                                                    "all 0.2s ease"
                                            }}
                                        >

                                            {/* PRODUCT */}
                                            <td
                                                style={{
                                                    padding: "18px",
                                                    color: "#fff"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "12px"
                                                    }}
                                                >

                                                    {/* AVATAR */}
                                                    <div
                                                        style={{
                                                            width: "42px",
                                                            height: "42px",
                                                            borderRadius: "14px",
                                                            background:
                                                                "linear-gradient(135deg,#3b82f6,#06b6d4)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontWeight: "700",
                                                            color: "#fff",
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        {
                                                            (
                                                                s.productName ||
                                                                "P"
                                                            )[0]
                                                        }
                                                    </div>

                                                    <div>

                                                        <div
                                                            style={{
                                                                fontWeight: "700"
                                                            }}
                                                        >
                                                            {
                                                                s.productName ||
                                                                "Unknown"
                                                            }
                                                        </div>

                                                        <small
                                                            style={{
                                                                color: "#94a3b8"
                                                            }}
                                                        >
                                                            Qty: {s.qty || 1}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CATALOG */}
                                            <td
                                                style={{
                                                    padding: "18px",
                                                    color: "#cbd5e1",
                                                    fontWeight: "600"
                                                }}
                                            >
                                                {s.catalogId || "N/A"}
                                            </td>

                                            {/* SELL */}
                                            <td
                                                style={{
                                                    padding: "18px",
                                                    color: "#4ade80",
                                                    fontWeight: "700"
                                                }}
                                            >
                                                ₹{
                                                    Number(
                                                        s.sellingPrice || 0
                                                    ).toFixed(2)
                                                }
                                            </td>

                                            {/* COST */}
                                            <td
                                                style={{
                                                    padding: "18px",
                                                    color: "#fca5a5",
                                                    fontWeight: "600"
                                                }}
                                            >
                                                ₹{
                                                    (
                                                        Number(
                                                            s.buyingPrice || 0
                                                        ) +
                                                        Number(
                                                            s.extra || 0
                                                        )
                                                    ).toFixed(2)
                                                }
                                            </td>

                                            {/* PROFIT */}
                                            <td
                                                style={{
                                                    padding: "18px"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                        background:
                                                            profit >= 0
                                                                ? "rgba(34,197,94,0.15)"
                                                                : "rgba(239,68,68,0.15)",
                                                        color:
                                                            profit >= 0
                                                                ? "#4ade80"
                                                                : "#f87171",
                                                        padding:
                                                            "8px 12px",
                                                        borderRadius:
                                                            "999px",
                                                        fontWeight: "700"
                                                    }}
                                                >
                                                    {profit >= 0
                                                        ? "▲"
                                                        : "▼"}

                                                    ₹{profit.toFixed(2)}
                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td
                                                style={{
                                                    padding: "18px"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        display:
                                                            "inline-flex",
                                                        alignItems:
                                                            "center",
                                                        gap: "6px",
                                                        background:
                                                            statusStyle.bg,
                                                        color:
                                                            statusStyle.color,
                                                        padding:
                                                            "8px 14px",
                                                        borderRadius:
                                                            "999px",
                                                        fontWeight: "700",
                                                        fontSize: "13px"
                                                    }}
                                                >
                                                    {statusStyle.text}
                                                </div>
                                            </td>

                                            {/* DATE */}
                                            <td
                                                style={{
                                                    padding: "18px",
                                                    color: "#cbd5e1"
                                                }}
                                            >

                                                {(() => {

                                                    const d =
                                                        getDate(
                                                            s.soldAt
                                                        );

                                                    if (!d)
                                                        return "N/A";

                                                    return (
                                                        <>
                                                            <div>
                                                                {
                                                                    d.toLocaleDateString()
                                                                }
                                                            </div>

                                                            <small
                                                                style={{
                                                                    color:
                                                                        "#64748b"
                                                                }}
                                                            >
                                                                {
                                                                    d.toLocaleTimeString()
                                                                }
                                                            </small>
                                                        </>
                                                    );
                                                })()}
                                            </td>

                                            {/* SELLER */}
                                            <td
                                                style={{
                                                    padding: "18px",
                                                    color: "#cbd5e1"
                                                }}
                                            >

                                                <div>
                                                    <div
                                                        style={{
                                                            fontWeight:
                                                                "600"
                                                        }}
                                                    >
                                                        {
                                                            s.createdBy
                                                                ?.shopName ||
                                                            "N/A"
                                                        }
                                                    </div>

                                                    <small
                                                        style={{
                                                            color:
                                                                "#64748b"
                                                        }}
                                                    >
                                                        {
                                                            s.createdBy
                                                                ?.name
                                                        }
                                                    </small>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;