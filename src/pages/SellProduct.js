import React, { useState, useRef, useEffect } from "react";
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
    const scannerInputRef = useRef(null);
    const scanLock = useRef(false);
    const [scanMode, setScanMode] = useState("device");
    const [scannerValue, setScannerValue] = useState("");
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
            const cleanedText = text.trim();
            const data = JSON.parse(cleanedText);

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

            const cleanedText = text.trim();
            const data = JSON.parse(cleanedText);

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

    useEffect(() => {

        if (
            document.activeElement.tagName !== "INPUT" &&
            document.activeElement.tagName !== "TEXTAREA"
        ) {
            scannerInputRef.current?.focus();
        }

    }, [scanned]);

    const handleScannerKeyDown = async (e) => {

        if (e.key === "Enter") {

            e.preventDefault();

            if (scanLock.current) return;

            scanLock.current = true;

            const value = scannerValue.trim();

            if (!value) {
                scanLock.current = false;
                return;
            }

            await handleScanData(value);

            setScannerValue("");

            setTimeout(() => {
                scanLock.current = false;
            }, 500);
        }
    };


    return (
        <div style={{ padding: "20px" }}>

            <h2>📷 Scan Product</h2>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "15px"
                }}
            >

                <button
                    onClick={() => setScanMode("device")}
                    style={{
                        background:
                            scanMode === "device"
                                ? "#4caf50"
                                : "#ddd"
                    }}
                >
                    [ 🔳 ] Device Scanner
                </button>

                <button
                    onClick={() => setScanMode("camera")}
                    style={{
                        background:
                            scanMode === "camera"
                                ? "#2196f3"
                                : "#ddd"
                    }}
                >
                    <img src="/gemini-svg.svg" alt="Scan QR" />
                </button>

            </div>

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



            {/* PRODUCT Camera SCANNER */}
            {!scanned && scanMode === "camera" && (
                <QRScanner onScan={handleScanData} />
            )}

            {/* PRODUCT Device SCANNER */}
            {!scanned && scanMode === "device" && (

                <div
                    style={{
                        border: "2px dashed #4caf50",
                        padding: "30px",
                        borderRadius: "12px",
                        textAlign: "center",
                        background: "#101828",
                        marginBottom: "20px"
                    }}
                >

                    <h2 style={{ color: "#4caf50" }}>
                        [ 🔳 ] Hardware Scanner Ready
                    </h2>

                    <p style={{ color: "#aaa" }}>
                        Scan Product QR using USB/Bluetooth Scanner
                    </p>

                    <div
                        style={{
                            marginTop: "15px",
                            fontSize: "14px",
                            color: "#00ff99"
                        }}
                    >
                        Waiting for scan...
                    </div>

                    <input
                        ref={scannerInputRef}
                        type="text"
                        value={scannerValue}
                        onChange={(e) => setScannerValue(e.target.value)}
                        onKeyDown={handleScannerKeyDown}
                        autoFocus
                        style={{
                            position: "absolute",
                            top: "-1000px",
                            left: "-1000px"
                        }}
                    />

                </div>
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
                    <div style={{ color: "#4caf50" }}>
                        ✅ Product Scanned
                    </div>

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
                            <div style={{ color: "red" }}>
                                ❌ Already Sold
                            </div>
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