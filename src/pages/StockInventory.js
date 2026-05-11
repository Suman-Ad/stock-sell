import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, query, where, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { writeBatch } from "firebase/firestore";
import "../assets/StockInventory.css";
import {
    categoryMap,
    colorOptions,
    productTypes,
    productTypeMap,
    productSizeTypeMap,
    sizeCategoryMap,
    getProductTypes,
    getSizesByProduct,
    getSizeType
} from "../components/CategoryMap";
import FeatureGate from "../components/FeatureGate";


export const createQRCodesBulk = async ({
    stockId,
    product,
    sizeKey,
    startFrom,
    quantity
}) => {

    const promises = [];

    for (let i = 1; i <= quantity; i++) {
        const unitNo = startFrom + i;

        const qrData = {
            stockId,
            productName: product.productName,
            productId: product.productId,
            catalogId: product.catalogId,

            category: product.category || "",
            subCategory: product.subCategory || "",
            productType: product.productType || "",

            size: sizeKey,
            color: product.color || "",

            unitNo,
            uniqueId: `${product.productId}-${sizeKey}-${stockId}-${unitNo}`,

            sellingPrice: product.sizes[sizeKey].sellingPrice || 0,

            status: "available",
            printed: false, // 🔥 KEY FLAG

            createdAt: serverTimestamp()
        };

        promises.push(addDoc(collection(db, "qrcodes"), qrData));
    }

    await Promise.all(promises);
};

const getSellingPrice = (buying, margin = 0, extraCosts = {}) => {
    const base = Number(buying) || 0;

    const breakEven =
        base * (1 + Number(margin || 0) / 100) +
        Number(extraCosts.packaging || 0) +
        Number(extraCosts.labeling || 0) +
        Number(extraCosts.rto || 0) +
        Number(extraCosts.returnCost || 0) +
        Number(extraCosts.advertisementCost || 0) +
        Number(extraCosts.delivery || 0) +
        Number(extraCosts.others || 0);

    const gst = Number(extraCosts.gst || 0);

    const withGST = breakEven * (1 + gst / 100);

    return Number(withGST.toFixed(0)); // ✅ clean integer
};

const StockInventory = ({ user }) => {
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [productType, setProductType] = useState("");
    const [color, setColor] = useState("");
    const [customColor, setCustomColor] = useState("");
    const [catalogId, setCatalogId] = useState("");
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processedCount, setProcessedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef(null);
    const resetFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const generateCatalogId = (productName, color, userId) => {
        const productShort = productName
            .split("-")
            .map(word => word[0])
            .join("")
            .toUpperCase();

        const colorShort = color.substring(0, 2).toUpperCase();

        // 🔥 Strong random (6 chars)
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 🔥 Timestamp (last 5 digits)
        const timePart = Date.now().toString().slice(-5);

        // 🔥 User short (last 4 chars)
        const userPart = userId.slice(-4).toUpperCase();

        const catalogId = `${productShort}-${colorShort}-${randomPart}`;
        const productId = `${userPart}-${productShort}-${colorShort}-${randomPart}-${timePart}`;

        return { catalogId, productId };
    };

    const [sizes, setSizes] = useState([
        {
            size: "S", qty: 0, buyingPrice: 0, margin: 0, extraCosts: {
                packaging: 0,
                labeling: 0,
                rto: 0,
                returnCost: 0,
                advertisementCost: 0,
                delivery: 0,
                others: 0,
                gst: 0
            }
        },
        {
            size: "M", qty: 0, buyingPrice: 0, margin: 0, extraCosts: {
                packaging: 0,
                labeling: 0,
                rto: 0,
                returnCost: 0,
                advertisementCost: 0,
                delivery: 0,
                others: 0,
                gst: 0
            }
        },
        {
            size: "L", qty: 0, buyingPrice: 0, margin: 0, extraCosts: {
                packaging: 0,
                labeling: 0,
                rto: 0,
                returnCost: 0,
                advertisementCost: 0,
                delivery: 0,
                others: 0,
                gst: 0
            }
        }
    ]);

    const [remarks, setRemarks] = useState("");

    const totalQty = sizes.reduce((sum, s) => sum + s.qty, 0);

    const totalInvestment = sizes.reduce(
        (sum, s) => sum + (s.qty * s.buyingPrice),
        0
    );

    const totalExtraCost = sizes.reduce((sum, s) => {
        const extraCosts = s.extraCosts || {};
        const qty = Number(s.qty || 0);

        const breake =
            Number(extraCosts.packaging || 0) +
            Number(extraCosts.labeling || 0) +
            Number(extraCosts.rto || 0) +
            Number(extraCosts.returnCost || 0) +
            Number(extraCosts.advertisementCost || 0) +
            Number(extraCosts.delivery || 0) +
            Number(extraCosts.others || 0);

        return sum + (breake * qty); // ✅ multiply by qty
    }, 0);

    const totalSellingValue = sizes.reduce(
        (sum, s) => sum + (s.qty * getSellingPrice(s.buyingPrice, s.margin, s.extraCosts)),
        0
    );

    const totalProfit = sizes.reduce(
        (sum, s) => sum + (s.qty * ((s.buyingPrice * s.margin) / 100)),
        0
    );

    // Handle size qty change
    const handleSizeChange = (index, value) => {
        if (value < 0) return;
        const updated = [...sizes];
        updated[index].qty = Number(value);
        setSizes(updated);
    };

    const handleBuyingPriceChange = (index, value) => {
        const updated = [...sizes];
        updated[index].buyingPrice = Number(value);
        setSizes(updated);
    };

    const handleMarginChange = (index, value) => {
        const updated = [...sizes];
        updated[index].margin = Number(value);
        setSizes(updated);
    };


    // Add new size row
    const addSizeRow = () => {
        const last = sizes[sizes.length - 1];

        if (!last.size) {
            alert("Fill previous size first!");
            return;
        }

        setSizes([
            ...sizes,
            {
                size: "",
                qty: 0,
                buyingPrice: 0,
                margin: 0,
                extraCosts: {
                    packaging: 0,
                    labeling: 0,
                    rto: 0,
                    returnCost: 0,
                    advertisementCost: 0,
                    delivery: 0,
                    gst: 0
                }
            }
        ]);
    };

    // Handle size name change
    const handleSizeNameChange = (index, value) => {
        const updated = [...sizes];

        // ❌ prevent duplicate size
        const exists = updated.some(
            (s, i) => s.size === value && i !== index
        );

        if (exists) {
            alert("Size already exists!");
            return;
        }

        updated[index].size = value.trim();
        setSizes(updated);
    };

    const handleExtraCostChange = (index, field, value) => {
        const updated = [...sizes];
        updated[index].extraCosts[field] = Number(value);
        setSizes(updated);
    };

    // Save to Firestore
    const handleSave = async () => {
        try {
            if (!user.uid) {
                alert("User not logged in!");
                return;
            }


            const sizeObject = {};

            sizes.forEach((s) => {
                if (s.size && s.qty > 0) {
                    sizeObject[s.size] = {
                        qty: s.qty,
                        initialQty: s.qty,
                        buyingPrice: s.buyingPrice,
                        margin: s.margin,
                        extraCosts: s.extraCosts,
                        sellingPrice: getSellingPrice(
                            s.buyingPrice,
                            s.margin,
                            s.extraCosts
                        )
                    };
                }
            });

            if (Object.keys(sizeObject).length === 0) {
                alert("Add at least one valid size");
                return;
            }

            if (!category) {
                alert("Select category");
                return;
            }

            if (!subCategory) {
                alert("Select product");
                return;
            }

            if (!productType) {
                alert("Select product type");
                return;
            }

            if (!color && !customColor) {
                alert("Select color");
                return;
            }

            const finalColor =
                color === "custom"
                    ? customColor.trim()
                    : color;

            const normalizedColor =
                finalColor
                    ?.trim()
                    ?.toLowerCase();

            const productName = `${category}-${subCategory}-${productType}-${normalizedColor}`;
            const { catalogId, productId } = generateCatalogId(productName, normalizedColor, user.uid);

            setIsSaving(true);

            const docRef = await addDoc(collection(db, "stocks"), {
                category,
                subCategory,
                productType,
                color: normalizedColor,
                productName,
                productId,
                catalogId,
                catalogPopularity: "Low",
                sizes: sizeObject,
                remarks,
                userId: user.uid,
                createdBy: user,
                createdAt: serverTimestamp()
            });

            // 🔥 CREATE QR FOR EACH SIZE
            for (const sizeKey of Object.keys(sizeObject)) {
                const sizeData = sizeObject[sizeKey];
                const qrPromises = [];

                qrPromises.push(
                    createQRCodesBulk({
                        stockId: docRef.id,
                        product: {
                            ...sizeObject,
                            ...{
                                productName,
                                productId,
                                catalogId,
                                category,
                                subCategory,
                                productType,
                                color: normalizedColor,
                                sizes: sizeObject
                            }
                        },
                        sizeKey,
                        startFrom: 0,
                        quantity: sizeData.qty
                    })
                );
                await Promise.all(qrPromises);
            }
            setIsSaving(false);
            alert("✅ Stock + QR Created!");
        } catch (err) {
            alert(err.message);
        }
    };

    const downloadTemplate = () => {
        const data = [
            {
                catalogId: "", // 🔥 NEW COLUMN
                catalogPopularity: "Low",
                category: "Men",
                subCategory: "T-Shirt",
                productType: "Casual",
                color: "Black",
                size: "M",
                qty: 10,
                buyingPrice: 200,
                margin: 20,
                packaging: 10,
                labeling: 5,
                rto: 2,
                returnCost: 3,
                advertisementCost: 5,
                delivery: 20,
                others: 10,
                gst: 5,
                sellingPrice: ""
            }
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });

        saveAs(file, "Stock_Template.xlsx");
    };


    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            if (!jsonData.length) {
                alert("Excel is empty!");
                return;
            }

            setPreviewData(jsonData); // ✅ ONLY PREVIEW
        };

        reader.readAsArrayBuffer(file);
    };

    const confirmUpload = async () => {
        if (!previewData.length) return;

        if (!user?.uid) {
            alert("User not logged in!");
            return;
        }

        setLoading(true);
        setProcessedCount(0);
        setUploadProgress(0);

        try {
            const batch = writeBatch(db);

            const grouped = {};

            previewData.forEach((row) => {
                if (!row.category || !row.size || !row.qty) return;

                const key =
                    row.catalogId && row.catalogId.trim() !== ""
                        ? row.catalogId
                        : `${row.category}-${row.subCategory}-${row.productType}-${row.color}`;

                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(row);
            });

            const keys = Object.keys(grouped);
            setTotalCount(keys.length); // 🔥 total groups

            let processed = 0;

            for (const key of keys) {
                const rows = grouped[key];
                const first = rows[0];

                let catalogId = first.catalogId;
                let productId;

                const productName = `${first.category}-${first.subCategory}-${first.productType}-${first.color}`;

                if (catalogId && catalogId.trim() !== "") {
                    productId = `${catalogId}-${Date.now()}`;
                } else {
                    const generated = generateCatalogId(
                        productName,
                        first.color,
                        user.uid
                    );
                    catalogId = generated.catalogId;
                    productId = generated.productId;
                }

                const sizeObject = {};

                rows.forEach((row) => {
                    const extraCosts = {
                        packaging: Number(row.packaging || 0),
                        labeling: Number(row.labeling || 0),
                        rto: Number(row.rto || 0),
                        returnCost: Number(row.returnCost || 0),
                        advertisementCost: Number(row.advertisementCost || 0),
                        delivery: Number(row.delivery || 0),
                        others: Number(row.others || 0),
                        gst: Number(row.gst || 0)
                    };

                    let sellingPrice = row.sellingPrice;

                    if (!sellingPrice) {
                        sellingPrice = getSellingPrice(
                            row.buyingPrice,
                            row.margin,
                            extraCosts
                        );
                    }

                    if (sizeObject[row.size]) return;

                    sizeObject[row.size] = {
                        qty: Number(row.qty),
                        initialQty: Number(row.qty),
                        buyingPrice: Number(row.buyingPrice),
                        margin: Number(row.margin),
                        extraCosts,
                        sellingPrice: Number(sellingPrice.toFixed(0))
                    };
                });

                const q = query(
                    collection(db, "stocks"),
                    where("catalogId", "==", catalogId)
                );

                const existingDocs = await getDocs(q);

                if (!existingDocs.empty) {
                    const existingDoc = existingDocs.docs[0];
                    const existingData = existingDoc.data();

                    const mergedSizes = { ...existingData.sizes };

                    Object.keys(sizeObject).forEach((size) => {
                        if (mergedSizes[size]) {
                            mergedSizes[size].qty += sizeObject[size].qty;
                            mergedSizes[size].initialQty =
                                (mergedSizes[size].initialQty || mergedSizes[size].qty) +
                                sizeObject[size].qty;
                        } else {
                            mergedSizes[size] = sizeObject[size];
                        }
                    });

                    for (const size of Object.keys(sizeObject)) {

                        const qrQuery = query(
                            collection(db, "qrcodes"),
                            where("stockId", "==", existingData.id),
                            where("size", "==", size)
                        );

                        const qrSnapshot = await getDocs(qrQuery);

                        const existingCount = qrSnapshot.size;
                        const newQty = sizeObject[size].qty;

                        if (newQty > 0) {
                            await createQRCodesBulk({
                                stockId: existingDoc.id,
                                product: {
                                    ...existingData,
                                    sizes: mergedSizes
                                },
                                sizeKey: size,
                                startFrom: existingCount,
                                quantity: newQty
                            });
                        }
                    }

                    batch.update(existingDoc.ref, {
                        sizes: mergedSizes,
                        catalogPopularity:
                            first.catalogPopularity ||
                            existingData.catalogPopularity ||
                            "Low",
                        updatedAt: serverTimestamp()
                    });

                } else {
                    const docRef = doc(collection(db, "stocks"));

                    batch.set(docRef, {
                        category: first.category,
                        subCategory: first.subCategory,
                        productType: first.productType,
                        color: first.color,
                        productName,
                        productId,
                        catalogId,
                        catalogPopularity: "Low",
                        sizes: sizeObject,
                        remarks: first.remarks || "",
                        userId: user.uid,
                        createdBy: user,
                        createdAt: serverTimestamp()
                    });
                    for (const sizeKey of Object.keys(sizeObject)) {
                        await createQRCodesBulk({
                            stockId: docRef.id,
                            product: {
                                productName,
                                productId,
                                catalogId,
                                category: first.category,
                                subCategory: first.subCategory,
                                productType: first.productType,
                                color: first.color,
                                sizes: sizeObject
                            },
                            sizeKey,
                            startFrom: 0,
                            quantity: sizeObject[sizeKey].qty
                        });
                    }
                }



                // ✅ Update progress
                processed++;
                setProcessedCount(processed);

                const percent = Math.round((processed / keys.length) * 100);
                setUploadProgress(percent);
            }

            await batch.commit();

            alert("✅ Upload successful!");
            setPreviewData([]);
            resetFileInput();

        } catch (err) {
            console.error(err);
            alert("❌ Upload failed: " + err.message);
        }

        setLoading(false);
    };

    const currentSizeType = getSizeType(
        category,
        subCategory
    );

    const availableSizes = getSizesByProduct(
        category,
        subCategory
    );

    const availableProductTypes = getProductTypes(
        category,
        subCategory
    );

    useEffect(() => {

        if (!subCategory) return;

        const autoSizes = getSizesByProduct(
            category,
            subCategory
        );

        const starterSizes = autoSizes
            .slice(0, 3)
            .map(size => ({
                size,
                qty: 0,
                buyingPrice: 0,
                margin: 0,
                extraCosts: {
                    packaging: 0,
                    labeling: 0,
                    rto: 0,
                    returnCost: 0,
                    advertisementCost: 0,
                    delivery: 0,
                    others: 0,
                    gst: 0
                }
            }));

        setSizes(starterSizes);

    }, [category, subCategory]);

    useEffect(() => {

        if (!subCategory) return;

        const types = getProductTypes(
            category,
            subCategory
        );

        if (types.length > 0) {
            setProductType(types[0]);
        }

    }, [category, subCategory]);



    return (
        <div className="stock-container">
            {/* 🔹 Header */}
            <div className="stock-card">
                <h2>Stock Inventory</h2>
                <p>Welcome <b>{user?.name}</b></p>
            </div>
            <FeatureGate
                user={user}
                feature="fileUpload"
                title="File Uploading"
                description="Upgrade your plan to unlock File Uploading."
            >
                {/* 🔹 Upload Section */}
                <div className="stock-card upload-box">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleExcelUpload}
                        ref={fileInputRef}
                    />

                    <button className="btn secondary" onClick={downloadTemplate}>
                        Download Template
                    </button>

                    {previewData.length > 0 && (
                        <div className="stock-card">
                            <h3>Preview Data ({previewData.length} rows)</h3>

                            <div className="table-wrapper" style={{ scrollbarWidth: "thin" }}>
                                <table className="stock-table" >
                                    <thead>
                                        <tr>
                                            {Object.keys(previewData[0]).map((key) => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {previewData.slice(0, 10).map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j}>{val}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {loading && (
                                <div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>

                                    <p>{uploadProgress}% Completed</p>
                                    <p>Processed: {processedCount} / {totalCount}</p>
                                </div>
                            )}

                            <button className="btn success" onClick={confirmUpload}>
                                Confirm Upload
                            </button>

                            <button className="btn danger"
                                onClick={() => { setPreviewData([]); resetFileInput(); }}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </FeatureGate>

            <FeatureGate
                user={user}
                feature="buildInventory"
                title="Invetnory Build"
                description="Upgrade your plan to unlock Invetnory Build System."
            >
                {/* 🔹 Product Info */}
                <div className="stock-card stock-grid">

                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSubCategory("");
                            setProductType("");
                        }}
                    >
                        <option value="">Select Category</option>

                        {Object.keys(categoryMap).map(cat => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>


                    <select
                        value={subCategory}
                        onChange={(e) => {
                            setSubCategory(e.target.value);
                            setProductType("");
                        }}
                        disabled={!category}
                    >
                        <option value="">
                            Select Product
                        </option>

                        {(categoryMap[category] || []).map(sub => (
                            <option key={sub} value={sub}>
                                {sub}
                            </option>
                        ))}
                    </select>


                    <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        disabled={!subCategory}
                    >
                        <option value="">
                            Select Product Type
                        </option>

                        {(availableProductTypes.length
                            ? availableProductTypes
                            : productTypes
                        ).map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <select value={color}
                        onChange={(e) => setColor(e.target.value)}>
                        <option value="">Color</option>
                        {colorOptions.map(c => (
                            <option key={c}>{c}</option>
                        ))}
                        <option value="custom">Other</option>
                    </select>

                    {color === "custom" && (
                        <input
                            placeholder="Custom Color"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                        />
                    )}
                </div>

                {/* 🔹 Sizes */}
                <div className="stock-card">

                    <h4 style={{ top: 0, position: "sticky", zIndex: 100 }} >Sizes & Pricing</h4>

                    {sizes.map((s, index) => {
                        const selling = getSellingPrice(s.buyingPrice, s.margin, s.extraCosts);
                        const profit = (s.buyingPrice * s.margin) / 100;

                        return (
                            <div className="size-row" key={index}>

                                {/* LEFT */}
                                <div className="stock-grid">

                                    <div className="input-group">
                                        <label>
                                            Size
                                            <small
                                                style={{
                                                    color: "#64748b",
                                                    marginLeft: "6px",
                                                    fontSize: "10px"
                                                }}
                                            >
                                                ({currentSizeType})
                                            </small>
                                        </label>

                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "6px",
                                                alignItems: "center"
                                            }}
                                        >

                                            {/* PREDEFINED SIZE SELECT */}
                                            <select
                                                value={
                                                    availableSizes.includes(s.size)
                                                        ? s.size
                                                        : ""
                                                }
                                                onChange={(e) =>
                                                    handleSizeNameChange(index, e.target.value)
                                                }
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">
                                                    Select Size
                                                </option>

                                                {availableSizes.map((sizeOption) => (

                                                    <option
                                                        key={sizeOption}
                                                        value={sizeOption}
                                                    >
                                                        {sizeOption}
                                                    </option>

                                                ))}
                                            </select>

                                            {/* CUSTOM SIZE */}
                                            <input
                                                placeholder="Custom"
                                                value={
                                                    availableSizes.includes(s.size)
                                                        ? ""
                                                        : s.size
                                                }
                                                onChange={(e) =>
                                                    handleSizeNameChange(index, e.target.value)
                                                }
                                                style={{
                                                    width: "90px"
                                                }}
                                            />

                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label>Qty</label>
                                        <input
                                            type="number"
                                            value={s.qty}
                                            onChange={(e) => handleSizeChange(index, e.target.value)}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>Buying Price (₹)</label>
                                        <input
                                            type="number"
                                            value={s.buyingPrice}
                                            onChange={(e) => handleBuyingPriceChange(index, e.target.value)}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>Margin (%)</label>
                                        <input
                                            type="number"
                                            value={s.margin}
                                            onChange={(e) => handleMarginChange(index, e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* EXTRA COST */}
                                <div className="extra-cost-grid">
                                    {Object.keys(s.extraCosts).map((key) => (
                                        <div className="input-group">
                                            <label>{key.toUpperCase()}</label>
                                            <input
                                                type="number"
                                                value={s.extraCosts[key]}
                                                onChange={(e) =>
                                                    handleExtraCostChange(index, key, e.target.value)
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* PRICE BOX */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                                    <div className="summary-card">
                                        <p>
                                            Total:
                                            ₹{s.qty * s.buyingPrice}
                                        </p>
                                        <p>Selling: ₹{selling}</p>
                                        <p className={profit >= 0 ? "profit" : "loss"}>
                                            Profit: ₹{profit}
                                        </p>
                                    </div>
                                    {s.qty <= 2 && s.qty > 0 && (
                                        <p className="warning">
                                            Low Stock
                                        </p>
                                    )}
                                    <button
                                        className="btn danger"
                                        onClick={() => {
                                            setSizes(prev =>
                                                prev.filter((_, i) => i !== index)
                                            );
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>



                            </div>
                        );
                    })}

                    <button className="btn secondary" onClick={addSizeRow}>
                        + Add Size
                    </button>

                    <textarea
                        placeholder="Remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </div>

                {/* 🔹 Summary */}
                <div className="summary-card">
                    <h4>Summary</h4>

                    <p>Total Qty: <b>{totalQty}</b></p>
                    <p>Investment: <b>₹{totalInvestment}</b></p>
                    <p>Extra Cost: <b>₹{totalExtraCost}</b></p>
                    <p>Selling: <b>₹{totalSellingValue}</b></p>

                    <p className="profit">
                        Profit: ₹{totalProfit}
                    </p>
                </div>
                {/* 🔹 Save */}
                <button
                    className="btn primary"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : "Save Stock"}
                </button>

            </FeatureGate>

        </div>
    );
};

export default StockInventory;