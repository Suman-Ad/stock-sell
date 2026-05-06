import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import useUserRole from "../hooks/useUserRole";
import { QRCodeCanvas } from "qrcode.react";
import "../assets/SalesHistory.css";

const SalesHistory = ({ user }) => {
    const [sales, setSales] = useState([]);
    const [filterDate, setFilterDate] = useState("");
    const role = useUserRole();
    const [deletingId, setDeletingId] = useState(null);
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
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(s => !s.deleted);
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

        let saleDate;

        if (s.soldAt?.toDate) {
            saleDate = s.soldAt.toDate().toISOString().split("T")[0];
        } else {
            saleDate = new Date(s.soldAt).toISOString().split("T")[0];
        }

        return saleDate === filterDate;
    });

    const handleDelete = async (sale) => {
        if (!window.confirm("Are you sure?")) return;

        setDeletingId(sale.id);

        try {
            // 🔥 Restore QR
            if (sale.qrId) {
                await updateDoc(doc(db, "qrcodes", sale.qrId), {
                    status: "available"
                });
            }

            // 🔥 Delete sale
            await deleteDoc(doc(db, "sales", sale.id));

        } catch (error) {
            console.error(error);
        }

        setDeletingId(null);
    };

    // return (
    //     <div style={{ padding: "20px" }}>
    //         <h2>🧾 Sales History</h2>

    //         <div style={{
    //             marginBottom: "20px",
    //             padding: "15px",
    //             background: "#f5f5f5",
    //             borderRadius: "8px"
    //         }}>
    //             <h3>📊 Sales Summary</h3>

    //             <p>Total Orders: <b>{totalSales}</b></p>
    //             <p>Total Revenue: <b>₹{totalRevenue.toFixed(2)}</b></p>
    //             <p>Total Profit: <b style={{ color: "green" }}>₹{totalProfit.toFixed(2)}</b></p>
    //         </div>

    //         <input
    //             type="date"
    //             value={filterDate}
    //             onChange={(e) => setFilterDate(e.target.value)}
    //         />

    //         <table border="1" cellPadding="10">
    //             <thead>
    //                 <tr>
    //                     <th>QR</th>
    //                     <th>Date</th>
    //                     <th>Product</th>
    //                     <th>Size</th>
    //                     <th>Price</th>
    //                     <th>Profit</th>
    //                     <th>Action</th>
    //                 </tr>
    //             </thead>

    //             <tbody>
    //                 {filteredSales.map((s, i) => (
    //                     <tr key={s.id}>
    //                         <td>
    //                             <QRCodeCanvas value={JSON.stringify(s)} size={140} />
    //                         </td>
    //                         <td>
    //                             {s.soldAt?.toDate
    //                                 ? s.soldAt.toDate().toLocaleString()
    //                                 : new Date(s.soldAt).toLocaleString()}
    //                         </td>
    //                         <td>{s.productName}</td>
    //                         <td>{s.size}</td>
    //                         <td>₹{s.sellingPrice}</td>
    //                         <td style={{ color: s.profit < 0 ? "red" : "green" }}>
    //                             ₹{s.profit?.toFixed(2)}
    //                         </td>
    //                         <td>
    //                             {(role === "admin" || s.userId === auth.currentUser.uid) && (
    //                                 <button
    //                                     disabled={deletingId === s.id}
    //                                     onClick={() => handleDelete(s)}
    //                                     style={{
    //                                         background: "red",
    //                                         color: "#fff",
    //                                         border: "none",
    //                                         padding: "6px 10px",
    //                                         cursor: "pointer",
    //                                         borderRadius: "4px"
    //                                     }}
    //                                 >
    //                                     {deletingId === s.id ? "Deleting..." : "Delete"}
    //                                 </button>
    //                             )}
    //                         </td>
    //                     </tr>
    //                 ))}
    //             </tbody>
    //         </table>
    //     </div>

    // );
    return (
        <div className="sales-page">

            <h2 className="page-title">🧾 Sales History</h2>

            {/* SUMMARY */}
            <div className="sales-summary">

                <div className="summary-card">
                    <span>Total Orders</span>
                    <h2>{totalSales}</h2>
                </div>

                <div className="summary-card">
                    <span>Total Revenue</span>
                    <h2>₹{totalRevenue.toFixed(2)}</h2>
                </div>

                <div className={`summary-card ${totalProfit < 0 ? "loss" : "profit"}`}>
                    <span>Total Profit</span>
                    <h2>₹{totalProfit.toFixed(2)}</h2>
                </div>

            </div>

            {/* FILTER */}
            <div className="sales-filter">
                <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                />
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
                <table className="sales-table">
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
                        {filteredSales.map((s) => (
                            <tr key={s.id}>

                                <td>
                                    <div className="qr-preview">
                                        <QRCodeCanvas value={JSON.stringify(s)} size={100} />
                                    </div>
                                </td>

                                <td>
                                    {s.soldAt?.toDate
                                        ? s.soldAt.toDate().toLocaleString()
                                        : new Date(s.soldAt).toLocaleString()}
                                </td>

                                <td>{s.productName}</td>
                                <td>{s.size}</td>

                                <td>₹{s.sellingPrice}</td>

                                <td className={s.profit < 0 ? "loss" : "profit"}>
                                    ₹{s.profit?.toFixed(2)}
                                </td>

                                <td>
                                    {(role === "admin" || s.userId === auth.currentUser.uid) && (
                                        <button
                                            className="btn-delete"
                                            disabled={deletingId === s.id}
                                            onClick={() => handleDelete(s)}
                                        >
                                            {deletingId === s.id ? "Deleting..." : "Delete"}
                                        </button>
                                    )}
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default SalesHistory;