import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";
import { QRCodeCanvas } from "qrcode.react";

const SalesHistory = () => {
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
            const data = snapshot.docs.map(doc => doc.data());
            setSales(data);
        });

        return () => unsubscribe();
    }, [role]);

    return (
        <div style={{ padding: "20px" }}>
            <h2>🧾 Sales History</h2>

            <table border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th>QR</th>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Price</th>
                        <th>Date</th>
                    </tr>
                </thead>

                <tbody>
                    {sales.map((s, i) => (
                        <tr key={i}>
                            <td>
                                <QRCodeCanvas value={JSON.stringify(s)} size={80} />
                            </td>
                            <td>{s.productName}</td>
                            <td>{s.size}</td>
                            <td>₹{s.sellingPrice}</td>
                            <td>{new Date(s.soldAt).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SalesHistory;