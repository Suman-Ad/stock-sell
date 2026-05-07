// import React, { useState } from "react";
// import QRScanner from "../components/QrScanner";
// import { db, auth } from "../firebase";
// import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

// const SellProduct = ({ user }) => {
//     const [scanData, setScanData] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [scanned, setScanned] = useState(false);
//     const [stockOwner, setStockOwner] = useState(null);

//     // const handleScan = async (result) => {
//     //     if (!result) return;

//     //     try {
//     //         const data = JSON.parse(result?.text);
//     //         setScanData(data);
//     //     } catch {
//     //         alert("Invalid QR");
//     //     }
//     // };

//     const handleScanData = async (text) => {
//         try {
//             const data = JSON.parse(text);

//             if (!data.stockId) {
//                 alert("Invalid QR");
//                 return;
//             }

//             const docRef = doc(db, "stocks", data.stockId);
//             const docSnap = await getDoc(docRef);

//             if (!docSnap.exists()) {
//                 alert("Stock not found!");
//                 return;
//             }

//             const stock = docSnap.data();

//             // ✅ SET OWNER HERE (before confirm)
//             setStockOwner(stock.userId);

//             setScanData(data);
//             setScanned(true);

//         } catch {
//             alert("Invalid QR");
//         }
//     };

//     const confirmSale = async (data) => {
//         if (!window.confirm("Confirm Sale?")) return;

//         setLoading(true);

//         try {
//             if (!data.stockId) {
//                 alert("Invalid QR (missing stock reference)");
//                 return;
//             }

//             const docRef = doc(db, "stocks", data.stockId);
//             const docSnap = await getDoc(docRef);

//             if (!docSnap.exists()) {
//                 alert("Stock not found!");
//                 return;
//             }

//             const saleCheck = query(
//                 collection(db, "sales"),
//                 where("uniqueId", "==", data.uniqueId)
//             );

//             const existing = await getDocs(saleCheck);

//             if (!existing.empty) {
//                 alert("❌ This item is already sold!");
//                 setLoading(false);
//                 return;
//             }

//             const qrQuery = query(
//                 collection(db, "qrcodes"),
//                 where("uniqueId", "==", data.uniqueId)
//             );

//             const qrSnap = await getDocs(qrQuery);

//             if (qrSnap.empty) {
//                 alert("QR not found!");
//                 return;
//             }

//             // get QR doc
//             const qrDoc = qrSnap.docs[0];

//             // ❌ Prevent double sell at QR level
//             if (qrDoc.data().status === "sold") {
//                 alert("❌ Already Sold!");
//                 return;
//             }

//             const stock = docSnap.data();

//             // 🔥 NEW: OWNERSHIP CHECK
//             const currentUser = auth.currentUser;

//             if (stock.userId !== currentUser.uid) {
//                 alert("❌ You can only sell your own product!");
//                 return;
//             }

//             const sizes = { ...stock.sizes };
//             const currentSize = sizes[data.size];

//             if (!currentSize || currentSize.qty <= 0) {
//                 alert("Out of stock!");
//                 return;
//             }

//             const buyingPrice = Number(currentSize.buyingPrice || 0);
//             // const sellingPrice = Number(data.sellingPrice || 0);

//             // extra cost
//             const extraCosts = currentSize.extraCosts  || {};
//             const extra =
//                 Number(extraCosts.packaging || 0) +
//                 Number(extraCosts.labeling || 0) +
//                 Number(extraCosts.rto || 0) +
//                 Number(extraCosts.returnCost || 0) +
//                 Number(extraCosts.advertisementCost || 0) +
//                 Number(extraCosts.delivery || 0) +
//                 Number(extraCosts.others || 0);

//             // // GST
//             // const gstPercent = Number(extraCosts.gst  || 0);
//             // const gstAmount = ((buyingPrice + extra) * gstPercent) / 100;

//             // ✅ FINAL PROFIT (FOR 1 ITEM ONLY)
//             const profit = (buyingPrice * Number(currentSize.margin)) / 100;

//             currentSize.qty -= 1;

//             await updateDoc(docRef, { sizes });

//             await addDoc(collection(db, "sales"), {
//                 ...data,
//                 qrId: data.id,
//                 buyingPrice,
//                 profit,
//                 extra,
//                 userId: currentUser.uid,
//                 soldAt: serverTimestamp()
//             });

//             await updateDoc(doc(db, "qrcodes", qrDoc.id), {
//                 status: "sold",
//                 soldAt: serverTimestamp()
//             });

//             alert("✅ Sold successfully!");

//             setScanData(null);
//             setScanned(false);

//         } catch (err) {
//             alert(err.message);
//         }

//         setLoading(false);
//     };

//     return (
//         <div style={{ padding: "20px" }}>
//             <h2>📷 Scan to Sell</h2>

//             {scanned && (
//                 <button onClick={() => {
//                     setScanData(null);
//                     setScanned(false);
//                 }}>
//                     🔄 Scan Again
//                 </button>
//             )}
//             {!scanned && (
//                 <QRScanner onScan={handleScanData} />
//             )}

//             {scanData && (
//                 <div style={{ marginTop: "20px", border: "1px solid #ccc", padding: "15px" }}>

//                     <h3>Product Details</h3>
//                     <p>
//                         Owner:{" "}
//                         <b style={{
//                             color:
//                                 stockOwner === null
//                                     ? "gray"
//                                     : stockOwner === auth.currentUser.uid
//                                         ? "green"
//                                         : "red"
//                         }}>
//                             {stockOwner === null
//                                 ? "Checking..."
//                                 : stockOwner === auth.currentUser.uid
//                                     ? "You"
//                                     : "Another User"}
//                         </b>
//                     </p>
//                     <p><b>{scanData.productName}</b></p>
//                     <p>Size: {scanData.size}</p>
//                     <p>Price: ₹{scanData.sellingPrice}</p>

//                     <button
//                         disabled={stockOwner !== auth.currentUser.uid}
//                         onClick={() => confirmSale(scanData)}
//                     >
//                         ✅ Confirm Sale
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default SellProduct;


import React, { useState } from "react";
import QRScanner from "../components/QrScanner";
import { db, auth } from "../firebase";
import {
    doc,
    getDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from "firebase/firestore";

const SellProduct = ({ user }) => {

    // PRODUCT
    const [scanData, setScanData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [stockOwner, setStockOwner] = useState(null);

    // CUSTOMER
    const [showCustomerScanner, setShowCustomerScanner] = useState(false);

    const [customer, setCustomer] = useState({
        name: "",
        phone: "",
        email: "",
        address: ""
    });

    // =========================
    // PRODUCT QR SCAN
    // =========================
    const handleScanData = async (text) => {

        try {
            const data = JSON.parse(text);

            if (!data.stockId) {
                alert("Invalid Product QR");
                return;
            }

            const docRef = doc(db, "stocks", data.stockId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Stock not found!");
                return;
            }

            const stock = docSnap.data();

            setStockOwner(stock.userId);

            setScanData(data);
            setScanned(true);

        } catch {
            alert("Invalid Product QR");
        }
    };

    // =========================
    // CUSTOMER QR SCAN
    // =========================
    const handleCustomerQR = (text) => {

        try {

            const data = JSON.parse(text);

            setCustomer({
                name: data.name || "",
                phone: data.phone || "",
                email: data.email || "",
                address: data.address || ""
            });

            setShowCustomerScanner(false);

            alert("✅ Customer Loaded");

        } catch {
            alert("Invalid Customer QR");
        }
    };

    // =========================
    // CONFIRM SALE
    // =========================
    const confirmSale = async (data) => {

        if (!customer.name || !customer.phone) {
            alert("Please enter customer details");
            return;
        }

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

            // DUPLICATE CHECK
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

            // QR CHECK
            const qrQuery = query(
                collection(db, "qrcodes"),
                where("uniqueId", "==", data.uniqueId)
            );

            const qrSnap = await getDocs(qrQuery);

            if (qrSnap.empty) {
                alert("QR not found!");
                return;
            }

            const qrDoc = qrSnap.docs[0];

            if (qrDoc.data().status === "sold") {
                alert("❌ Already Sold!");
                return;
            }

            const stock = docSnap.data();

            const currentUser = auth.currentUser;

            // OWNER CHECK
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

            const buyingPrice = Number(currentSize.buyingPrice || 0);

            // EXTRA COST
            const extraCosts = currentSize.extraCosts || {};

            const extra =
                Number(extraCosts.packaging || 0) +
                Number(extraCosts.labeling || 0) +
                Number(extraCosts.rto || 0) +
                Number(extraCosts.returnCost || 0) +
                Number(extraCosts.advertisementCost || 0) +
                Number(extraCosts.delivery || 0) +
                Number(extraCosts.others || 0);

            // PROFIT
            const profit =
                (buyingPrice * Number(currentSize.margin || 0)) / 100;

            // REDUCE STOCK
            currentSize.qty -= 1;

            await updateDoc(docRef, { sizes });

            // SAVE SALE
            await addDoc(collection(db, "sales"), {

                ...data,

                qrId: data.id,

                buyingPrice,
                profit,
                extra,

                customer,

                userId: currentUser.uid,

                soldAt: serverTimestamp()
            });

            // UPDATE QR
            await updateDoc(doc(db, "qrcodes", qrDoc.id), {
                status: "sold",
                soldAt: serverTimestamp()
            });

            alert("✅ Sold successfully!");

            // RESET
            setScanData(null);
            setScanned(false);

            setCustomer({
                name: "",
                phone: "",
                email: "",
                address: ""
            });

        } catch (err) {

            alert(err.message);

        }

        setLoading(false);
    };

    return (
        <div style={{ padding: "20px" }}>

            <h2>📷 Scan to Sell</h2>

            {/* SCAN AGAIN */}
            {scanned && (
                <button
                    onClick={() => {
                        setScanData(null);
                        setScanned(false);
                    }}
                >
                    🔄 Scan Again
                </button>
            )}

            {/* PRODUCT SCANNER */}
            {!scanned && (
                <QRScanner onScan={handleScanData} />
            )}

            {/* PRODUCT DETAILS */}
            {scanData && (

                <div
                    style={{
                        marginTop: "20px",
                        border: "1px solid #ccc",
                        padding: "15px"
                    }}
                >

                    <h3>Product Details</h3>

                    <p>
                        Owner:{" "}
                        <b
                            style={{
                                color:
                                    stockOwner === null
                                        ? "gray"
                                        : stockOwner === auth.currentUser.uid
                                            ? "green"
                                            : "red"
                            }}
                        >
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

                    <hr />

                    {/* CUSTOMER DETAILS */}

                    <h3>Customer Details</h3>

                    <input
                        type="text"
                        placeholder="Customer Name"
                        value={customer.name}
                        onChange={(e) =>
                            setCustomer({
                                ...customer,
                                name: e.target.value
                            })
                        }
                        style={{ width: "100%", marginBottom: "10px" }}
                    />

                    <input
                        type="text"
                        placeholder="Phone Number"
                        value={customer.phone}
                        onChange={(e) =>
                            setCustomer({
                                ...customer,
                                phone: e.target.value
                            })
                        }
                        style={{ width: "100%", marginBottom: "10px" }}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={customer.email}
                        onChange={(e) =>
                            setCustomer({
                                ...customer,
                                email: e.target.value
                            })
                        }
                        style={{ width: "100%", marginBottom: "10px" }}
                    />

                    <textarea
                        placeholder="Address"
                        value={customer.address}
                        onChange={(e) =>
                            setCustomer({
                                ...customer,
                                address: e.target.value
                            })
                        }
                        style={{
                            width: "100%",
                            marginBottom: "10px"
                        }}
                    />

                    {/* CUSTOMER QR */}

                    <button
                        onClick={() =>
                            setShowCustomerScanner(!showCustomerScanner)
                        }
                    >
                        📷 Scan Customer QR
                    </button>

                    {showCustomerScanner && (
                        <div style={{ marginTop: "15px" }}>
                            <QRScanner onScan={handleCustomerQR} />
                        </div>
                    )}

                    <hr />

                    <button
                        disabled={
                            stockOwner !== auth.currentUser.uid ||
                            loading
                        }
                        onClick={() => confirmSale(scanData)}
                    >
                        {loading
                            ? "Selling..."
                            : "✅ Confirm Sale"}
                    </button>

                </div>
            )}
        </div>
    );
};

export default SellProduct;