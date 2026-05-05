import React, { useState } from "react";
import QRScanner from "../components/QrScanner";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

const SellProduct = ({ user }) => {
    const [scanData, setScanData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [stockOwner, setStockOwner] = useState(null);

    // const handleScan = async (result) => {
    //     if (!result) return;

    //     try {
    //         const data = JSON.parse(result?.text);
    //         setScanData(data);
    //     } catch {
    //         alert("Invalid QR");
    //     }
    // };

    const handleScanData = async (text) => {
        try {
            const data = JSON.parse(text);

            if (!data.stockId) {
                alert("Invalid QR");
                return;
            }

            const docRef = doc(db, "stocks", data.stockId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Stock not found!");
                return;
            }

            const stock = docSnap.data();

            // ✅ SET OWNER HERE (before confirm)
            setStockOwner(stock.userId);

            setScanData(data);
            setScanned(true);

        } catch {
            alert("Invalid QR");
        }
    };

    const confirmSale = async (data) => {
        if (!window.confirm("Confirm Sale?")) return;

        setLoading(true);

        try {
            if (!data.stockId) {
                alert("Invalid QR (missing stock reference)");
                return;
            }

            const docRef = doc(db, "stocks", data.stockId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Stock not found!");
                return;
            }

            const saleCheck = query(
                collection(db, "sales"),
                where("uniqueId", "==", data.uniqueId)
            );

            const existing = await getDocs(saleCheck);

            if (!existing.empty) {
                alert("❌ This item is already sold!");
                setLoading(false);
                return;
            }

            const qrQuery = query(
                collection(db, "qrcodes"),
                where("uniqueId", "==", data.uniqueId)
            );

            const qrSnap = await getDocs(qrQuery);

            if (qrSnap.empty) {
                alert("QR not found!");
                return;
            }

            // get QR doc
            const qrDoc = qrSnap.docs[0];

            // ❌ Prevent double sell at QR level
            if (qrDoc.data().status === "sold") {
                alert("❌ Already Sold!");
                return;
            }

            const stock = docSnap.data();

            // 🔥 NEW: OWNERSHIP CHECK
            const currentUser = auth.currentUser;

            if (stock.userId !== currentUser.uid) {
                alert("❌ You can only sell your own product!");
                return;
            }

            const sizes = { ...stock.sizes };
            const currentSize = sizes[data.size];

            if (!currentSize || currentSize.qty <= 0) {
                alert("Out of stock!");
                return;
            }

            const buyingPrice = currentSize.buyingPrice;
            const profit = data.sellingPrice - buyingPrice;

            currentSize.qty -= 1;

            await updateDoc(docRef, { sizes });

            await addDoc(collection(db, "sales"), {
                ...data,
                qrId: data.id,
                buyingPrice,
                profit,
                userId: currentUser.uid,
                soldAt: serverTimestamp()
            });

            await updateDoc(doc(db, "qrcodes", qrDoc.id), {
                status: "sold",
                soldAt: serverTimestamp()
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

            {scanned && (
                <button onClick={() => {
                    setScanData(null);
                    setScanned(false);
                }}>
                    🔄 Scan Again
                </button>
            )}
            {!scanned && (
                <QRScanner onScan={handleScanData} />
            )}

            {scanData && (
                <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "15px" }}>

                    <h3>Product Details</h3>
                    <p>
                        Owner:{" "}
                        <b style={{
                            color:
                                stockOwner === null
                                    ? "gray"
                                    : stockOwner === auth.currentUser.uid
                                        ? "green"
                                        : "red"
                        }}>
                            {stockOwner === null
                                ? "Checking..."
                                : stockOwner === auth.currentUser.uid
                                    ? "You"
                                    : "Another User"}
                        </b>
                    </p>
                    <p><b>{scanData.productName}</b></p>
                    <p>Size: {scanData.size}</p>
                    <p>Price: ₹{scanData.sellingPrice}</p>

                    <button
                        disabled={stockOwner !== auth.currentUser.uid}
                        onClick={() => confirmSale(scanData)}
                    >
                        ✅ Confirm Sale
                    </button>
                </div>
            )}
        </div>
    );
};

export default SellProduct;