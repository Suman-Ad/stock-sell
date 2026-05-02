import React, { useState } from "react";
import QRScanner from "../components/QrScanner";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";

const SellProduct = () => {
    const [scanData, setScanData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);

    const handleScan = async (result) => {
        if (!result) return;

        try {
            const data = JSON.parse(result?.text);
            setScanData(data);
        } catch {
            alert("Invalid QR");
        }
    };


    const confirmSale = async (data) => {
        if (!window.confirm("Confirm Sale?")) return;

        setLoading(true);

        try {
            // ✅ Prevent duplicate selling
            const saleCheck = query(
                collection(db, "sales"),
                where("uniqueId", "==", data.uniqueId)
            );

            const existing = await getDocs(saleCheck);

            if (!existing.empty) {
                alert("❌ Already Sold!");
                setLoading(false);
                return;
            }

            // ✅ Find stock by productId
            const q = query(
                collection(db, "stocks"),
                where("productId", "==", data.productId)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("Stock not found!");
                setLoading(false);
                return;
            }

            const docSnap = snapshot.docs[0];
            const stock = docSnap.data();
            const docRef = doc(db, "stocks", docSnap.id);

            const sizes = { ...stock.sizes };

            // ✅ Check stock
            if (!sizes[data.size] || sizes[data.size].qty <= 0) {
                alert("Out of stock!");
                setLoading(false);
                return;
            }

            // ✅ Reduce quantity
            sizes[data.size].qty -= 1;

            // ✅ Update Firestore
            await updateDoc(docRef, { sizes });

            // ✅ Save sale record
            await addDoc(collection(db, "sales"), {
                ...data,
                buyingPrice: sizes[data.size].buyingPrice, // 🔥 REQUIRED
                userId: auth.currentUser.uid,
                soldAt: new Date().toISOString()
            });

            alert("✅ Sold successfully!");

            setScanData(null);
            setScanned(false);

        } catch (err) {
            alert(err.message);
        }

        setLoading(false);
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>📷 Scan to Sell</h2>


            <QRScanner onScan={(text) => {
                if (scanned) return;

                try {
                    const data = JSON.parse(text);

                    setScanData(data);
                    setScanned(true);

                } catch {
                    alert("Invalid QR");
                }
            }} />

            {scanData && (
                <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "15px" }}>
                    <h3>Product Details</h3>
                    <p><b>{scanData.productName}</b></p>
                    <p>Size: {scanData.size}</p>
                    <p>Price: ₹{scanData.sellingPrice}</p>

                    <button onClick={() => confirmSale(scanData)}>
                        ✅ Confirm Sale
                    </button>
                </div>
            )}
        </div>
    );
};

export default SellProduct;