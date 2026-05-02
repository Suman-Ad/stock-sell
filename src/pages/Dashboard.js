import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";

const Dashboard = () => {
    const [sales, setSales] = useState([]);
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
            setSales(snapshot.docs.map(doc => doc.data()));
        });

        return () => unsubscribe();
    }, [role]);

    // 🔥 Calculations
    const totalSales = sales.length;

    const totalRevenue = sales.reduce(
        (sum, s) => sum + (s.sellingPrice || 0),
        0
    );

    const totalCost = sales.reduce(
        (sum, s) => sum + (s.buyingPrice || 0),
        0
    );

    const totalProfit = totalRevenue - totalCost;

    return (
        <div style={{ padding: "20px" }}>
            <h2>📊 Dashboard</h2>

            <p>Total Sales: <b>{totalSales}</b></p>
            <p>Total Revenue: <b>₹{totalRevenue.toFixed(2)}</b></p>
            <p>Total Cost: <b>₹{totalCost.toFixed(2)}</b></p>
            <p style={{ color: "green" }}>
                Total Profit: <b>₹{totalProfit.toFixed(2)}</b>
            </p>
        </div>
    );
};

export default Dashboard;