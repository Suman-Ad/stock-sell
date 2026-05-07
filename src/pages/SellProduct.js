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
    setDoc,
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
        address: "",
        awbNo: "",
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

            // =========================
            // CHECK ALREADY SOLD
            // =========================
            const saleRef = doc(db, "sales", data.uniqueId);

            const saleSnap = await getDoc(saleRef);

            if (
                saleSnap.exists() &&
                saleSnap.data().deleted !== true
            ) {

                const saleData = saleSnap.data();

                alert(
                    `❌ Already Sold\n\n` +
                    `Customer: ${saleData?.customer?.name || "N/A"}\n` +
                    `Phone: ${saleData?.customer?.phone || "N/A"}\n` +
                    `AWB: ${saleData?.customer?.awbNo || "N/A"}`
                );

                // OPTIONAL UI DATA
                setScanData({
                    ...data,
                    saleHistory: saleData
                });

                setScanned(true);

                return;
            }

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
                address: data.address || "",
                awbNo: data || "",
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

        if (!customer.awbNo) {
            alert("Please enter customer AWB number");
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
            const saleRef = doc(db, "sales", data.uniqueId);

            const saleSnap = await getDoc(saleRef);

            if (
                saleSnap.exists() &&
                saleSnap.data().deleted !== true
            ) {
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
            await setDoc(
                doc(db, "sales", data.uniqueId),
                {
                    ...data,

                    qrId: data.id,
                    buyingPrice,
                    profit,
                    extra,
                    deleted: false,
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
                address: "",
                awbNo: "",
            });

        } catch (err) {

            alert(err.message);

        }

        setLoading(false);
    };

    return (
        <div style={{ padding: "20px" }}>

            <h2>📷 Scan Product</h2>

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
                    {/* SALE HISTORY */}
                    {scanData.saleHistory && (
                        <div
                            style={{
                                border: "1px solid red",
                                padding: "10px",
                                marginBottom: "15px",
                                background: "#27234d"
                            }}
                        >
                            <h3>📜 Sell History</h3>

                            <p>
                                <b>Customer:</b>{" "}
                                {scanData.saleHistory?.customer?.name || "N/A"}
                            </p>

                            <p>
                                <b>Phone:</b>{" "}
                                {scanData.saleHistory?.customer?.phone || "N/A"}
                            </p>

                            <p>
                                <b>AWB:</b>{" "}
                                {scanData.saleHistory?.customer?.awbNo || "N/A"}
                            </p>

                            <hr />

                        </div>
                    )}

                    {stockOwner === auth.currentUser.uid && !scanData.saleHistory && (
                        //CUSTOMER DETAILS
                        <div style={{ padding: "2px 5px" }}>

                            <h3>Customer Details</h3>
                            <button
                                onClick={() =>
                                    setShowCustomerScanner(!showCustomerScanner)
                                }
                                style={{ padding: "5px 5px", marginBottom: "10px" }}
                            >
                                📷 Scan Customer QR
                            </button>

                            <input
                                type="number"
                                placeholder="AWB No"
                                value={customer.awbNo}
                                onChange={(e) =>
                                    setCustomer({
                                        ...customer,
                                        awbNo: e.target.value
                                    })
                                }
                                // readOnly
                                style={{ width: "100%", marginBottom: "10px" }}
                            />

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
                            {showCustomerScanner && (
                                <div style={{ marginTop: "15px" }}>
                                    <QRScanner onScan={handleCustomerQR} />
                                </div>
                            )}

                            <hr />

                        </div>
                    )}

                    <button
                        disabled={
                            stockOwner !== auth.currentUser.uid ||
                            loading || scanData.saleHistory
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