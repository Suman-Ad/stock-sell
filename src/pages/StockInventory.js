import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, query, where, getDocs } from "firebase/firestore";
import StockList from "./StockList";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { writeBatch } from "firebase/firestore";

const categoryMap = {
    Men: ["T-Shirt", "Shirt", "Pant", "Panjabi"],
    Women: ["Top", "Shirt", "Saree", "Kurti"],
    Children: ["T-Shirt", "Panjabi", "Dress Set"]
};

const productTypes = ["Formal", "Casual", "Party Wear", "Sports"];
const colorOptions = [
    "Black", "White", "Red", "Blue", "Green",
    "Yellow", "Grey", "Navy", "Maroon"
];

// const getSellingPrice = (buying, margin, extraCosts) => {
//     const breakEven =
//         Number(buying) +
//         Number(extraCosts.packaging) +
//         Number(extraCosts.labeling) +
//         Number(extraCosts.rto) +
//         Number(extraCosts.returnCost) +
//         Number(extraCosts.advertisementCost) +
//         Number(extraCosts.delivery);

//     const withGST = breakEven * (1 + extraCosts.gst / 100);

//     return withGST * (1 + margin / 100);
// };

const getSellingPrice = (buying, margin, extraCosts) => {
    const breakEven =
        // Number(buying) +
        (margin ? Number(buying) * (1 + Number(margin) / 100) : 0) +
        Number(extraCosts.packaging) +
        Number(extraCosts.labeling) +
        Number(extraCosts.rto) +
        Number(extraCosts.returnCost) +
        Number(extraCosts.advertisementCost) +
        Number(extraCosts.delivery);

    const withGST = breakEven * (1 + extraCosts.gst / 100);

    return withGST;
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

    const totalSellingValue = sizes.reduce(
        (sum, s) => sum + (s.qty * getSellingPrice(s.buyingPrice, s.margin, s.extraCosts)),
        0
    );

    const totalProfit = totalSellingValue - totalInvestment;


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

        updated[index].size = value.toUpperCase();
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
                alert("Add at least one valid size with quantity");
                return;
            }

            const finalColor = color === "custom" ? customColor.trim() : color;

            if (!category || !subCategory || !productType || !finalColor) {
                alert("All fields including valid color are required");
                return;
            }

            const productName = `${category}-${subCategory}-${productType}-${finalColor}`;
            // ✅ Generate IDs properly
            const { catalogId, productId } = generateCatalogId(productName, finalColor, user.uid);
            setCatalogId(catalogId); // Set catalogId state to display in input

            await addDoc(collection(db, "stocks"), {
                category,
                subCategory,
                productType,
                color,
                productName,
                productId,
                catalogId,
                sizes: sizeObject,
                remarks,
                userId: user.uid,
                createdBy: user,
                createdAt: serverTimestamp()
            });

            alert("Stock Saved!");
            setCategory("");
            setSubCategory("");
            setProductType("");
            setColor("");
            setCustomColor("");

        } catch (err) {
            alert(err.message);
        }
    };

    const downloadTemplate = () => {
        const data = [
            {
                catalogId: "", // 🔥 NEW COLUMN
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

    // const handleExcelUpload = async (e) => {
    //     const file = e.target.files[0];
    //     if (!file) return;

    //     if (!user?.uid) {
    //         alert("User not logged in!");
    //         return;
    //     }

    //     const reader = new FileReader();

    //     reader.onload = async (evt) => {
    //         const data = new Uint8Array(evt.target.result);
    //         const workbook = XLSX.read(data, { type: "array" });

    //         const sheet = workbook.Sheets[workbook.SheetNames[0]];
    //         const jsonData = XLSX.utils.sheet_to_json(sheet);
    //         setPreviewData(jsonData);

    //         try {
    //             const batch = writeBatch(db);

    //             // 🔥 GROUP BY catalogId or product
    //             const grouped = {};

    //             jsonData.forEach((row) => {
    //                 if (!row.category || !row.size || !row.qty) return;

    //                 const key =
    //                     row.catalogId && row.catalogId.trim() !== ""
    //                         ? row.catalogId
    //                         : `${row.category}-${row.subCategory}-${row.productType}-${row.color}`;

    //                 if (!grouped[key]) grouped[key] = [];
    //                 grouped[key].push(row);
    //             });

    //             for (const key in grouped) {
    //                 const rows = grouped[key];

    //                 const first = rows[0];

    //                 let catalogId = first.catalogId;
    //                 let productId;

    //                 const productName = `${first.category}-${first.subCategory}-${first.productType}-${first.color}`;

    //                 // 🔥 catalog logic
    //                 if (catalogId && catalogId.trim() !== "") {
    //                     productId = `${catalogId}-${Date.now()}`;
    //                 } else {
    //                     const generated = generateCatalogId(
    //                         productName,
    //                         first.color,
    //                         user.uid
    //                     );
    //                     catalogId = generated.catalogId;
    //                     productId = generated.productId;
    //                 }

    //                 const sizeObject = {};

    //                 rows.forEach((row) => {
    //                     const extraCosts = {
    //                         packaging: Number(row.packaging || 0),
    //                         labeling: Number(row.labeling || 0),
    //                         rto: Number(row.rto || 0),
    //                         returnCost: Number(row.returnCost || 0),
    //                         advertisementCost: Number(row.advertisementCost || 0),
    //                         delivery: Number(row.delivery || 0),
    //                         gst: Number(row.gst || 0)
    //                     };

    //                     let sellingPrice = row.sellingPrice;

    //                     if (!sellingPrice) {
    //                         sellingPrice = getSellingPrice(
    //                             row.buyingPrice,
    //                             row.margin,
    //                             extraCosts
    //                         );
    //                     }

    //                     // ❌ prevent duplicate size
    //                     if (sizeObject[row.size]) return;

    //                     sizeObject[row.size] = {
    //                         qty: Number(row.qty),
    //                         buyingPrice: Number(row.buyingPrice),
    //                         margin: Number(row.margin),
    //                         extraCosts,
    //                         sellingPrice: Number(sellingPrice)
    //                     };
    //                 });

    //                 const docRef = doc(collection(db, "stocks"));

    //                 batch.set(docRef, {
    //                     category: first.category,
    //                     subCategory: first.subCategory,
    //                     productType: first.productType,
    //                     color: first.color,
    //                     productName,
    //                     productId,
    //                     catalogId,
    //                     sizes: sizeObject,
    //                     remarks: first.remarks || "",
    //                     userId: user.uid,
    //                     createdBy: user,
    //                     createdAt: serverTimestamp()
    //                 });
    //             }

    //             await batch.commit();

    //             alert("✅ Excel Uploaded Successfully!");

    //         } catch (err) {
    //             console.error(err);
    //             alert("❌ Upload failed: " + err.message);
    //         }
    //     };

    //     reader.readAsArrayBuffer(file);
    // };


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

        try {
            const batch = writeBatch(db);

            // 🔥 GROUPING
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

            for (const key in grouped) {
                const rows = grouped[key];
                const first = rows[0];

                let catalogId = first.catalogId;
                let productId;

                const productName = `${first.category}-${first.subCategory}-${first.productType}-${first.color}`;

                // 🔥 catalog logic
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
                        buyingPrice: Number(row.buyingPrice),
                        margin: Number(row.margin),
                        extraCosts,
                        sellingPrice: Number(sellingPrice)
                    };
                });

                // 🔍 CHECK EXISTING
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
                        } else {
                            mergedSizes[size] = sizeObject[size];
                        }
                    });

                    batch.update(existingDoc.ref, {
                        sizes: mergedSizes,
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
                        sizes: sizeObject,
                        remarks: first.remarks || "",
                        userId: user.uid,
                        createdBy: user,
                        createdAt: serverTimestamp()
                    });
                }
            }

            await batch.commit();

            alert("✅ Upload successful!");

            setPreviewData([]); // 🔥 clear preview

        } catch (err) {
            console.error(err);
            alert("❌ Upload failed: " + err.message);
        }

        setLoading(false);
    };

    return (
        <div style={{ padding: "20px" }}>
            <div style={{
                marginBottom: "20px",
                padding: "15px",
                backgroundColor: "#f0f0f0",
                borderRadius: "5px",
            }}>
                <h2>Stock Inventory</h2>
                <h2>Welcome {user.name}</h2>
                {/* <p>Role: {userData.role}</p> */}
                {/* <p>Shop: {userData.shopName}</p> */}

                <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                <button onClick={downloadTemplate}>Download Template</button>
                {previewData.length > 0 && (
                    <div style={{ marginTop: "20px", background: "#fff", padding: "10px" }}>
                        <h3>Preview Data ({previewData.length} rows)</h3>

                        <table border="1">
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

                        <button onClick={confirmUpload} disabled={loading}>
                            {loading ? "Uploading..." : "✅ Confirm Upload"}
                        </button>

                        <button onClick={() => setPreviewData([])}>
                            ❌ Cancel
                        </button>
                    </div>
                )}

                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "5px", display: "flex", flexDirection: "row", gap: "15px", flexWrap: "wrap" }}>
                    <h4>Category</h4>

                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSubCategory(""); // reset subcategory
                        }}
                    >
                        <option value="">Select Category</option>
                        {Object.keys(categoryMap).map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>

                    <h4>Sub Category</h4>

                    <select
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                        disabled={!category}
                    >
                        <option value="">Select SubCategory</option>
                        {(categoryMap[category] || []).map((sub) => (
                            <option key={sub} value={sub}>
                                {sub}
                            </option>
                        ))}
                    </select>

                    <h4>Product Type</h4>

                    <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        disabled={!subCategory}
                    >
                        <option value="">Select Product Type</option>
                        {productTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <h4>Color</h4>

                    <select
                        value={color}
                        onChange={(e) => {
                            setColor(e.target.value);
                            setCustomColor("");
                        }}
                    >
                        <option value="">Select Color</option>
                        {colorOptions.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                        <option value="custom">Other</option>
                    </select>

                    {color === "custom" && (
                        <input
                            placeholder="Enter Custom Color"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                        />
                    )}
                </div>

                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
                    <h4>Generated Catalog ID:</h4>
                    <input
                        placeholder="Catalog ID"
                        value={catalogId}
                        readOnly
                    />
                </div>

                <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>

                    <div style={{
                        marginBottom: "20px",
                        padding: "15px",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "5px",
                        overflow: "auto",
                        maxHeight: "480px",
                        flex: "1 1 480px"
                    }}>
                        <h4>Sizes - Quantity - Prices - Margin%</h4>
                        <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                            {sizes.map((s, index) => {
                                const selling = getSellingPrice(s.buyingPrice, s.margin, s.extraCosts);

                                return (
                                    <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                                        <div style={{ marginBottom: "20px", padding: "15px", background: "#f9f9f9" }}>
                                            <div>
                                                <label style={{ fontSize: "10px", color: "gray" }}>Size</label><br />
                                                <input
                                                    placeholder="Size"
                                                    value={s.size}
                                                    onChange={(e) =>
                                                        handleSizeNameChange(index, e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: "10px", color: "gray" }}>Qty</label><br />
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={s.qty}
                                                    onChange={(e) =>
                                                        handleSizeChange(index, e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: "10px", color: "gray" }}>Buying ₹</label><br />
                                                <input
                                                    type="number"
                                                    placeholder="Buying ₹"
                                                    value={s.buyingPrice}
                                                    onChange={(e) =>
                                                        handleBuyingPriceChange(index, e.target.value)
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: "10px", color: "gray" }}>Margin %</label><br />
                                                <input
                                                    type="number"
                                                    placeholder="Margin %"
                                                    value={s.margin}
                                                    onChange={(e) =>
                                                        handleMarginChange(index, e.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: "20px", padding: "15px", background: "#f9f9f9" }}>
                                            <h4>Extra Costs (Per Item)</h4>

                                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                                {Object.keys(s.extraCosts).map((key) => (
                                                    <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                        <span style={{ fontSize: "10px", color: "gray" }}>{key.toUpperCase()}</span><br />
                                                        <input
                                                            key={key}
                                                            type="number"
                                                            placeholder={key}
                                                            value={s.extraCosts[key]}
                                                            onChange={(e) =>
                                                                handleExtraCostChange(index, key, e.target.value)
                                                            }
                                                            style={{ width: "70px" }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ background: "#fff", padding: "4px 4px", whiteSpace: "nowrap" }}>
                                            <span>Selling Price:-₹{selling.toFixed(2)}</span>
                                            <br />
                                            <span style={{ color: "green" }}>
                                                Profit:-₹{(selling - s.buyingPrice).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={addSizeRow}>+ Add Size</button>

                        <br /><br />

                        <textarea
                            placeholder="Remarks / Description"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />

                        <br /><br />
                    </div>

                    <div style={{
                        // marginTop: "20px",
                        padding: "15px",
                        background: "#f5f5f5",
                        borderRadius: "8px"
                    }}>
                        <h4>📊 Live Summary</h4>

                        <p>Total Quantity: <b>{totalQty}</b></p>
                        <p>Avg Selling Price:
                            <b>
                                ₹{totalQty ? (totalSellingValue / totalQty).toFixed(2) : 0}
                            </b>
                        </p>
                        <p>Total Investment: <b>₹{totalInvestment}</b></p>
                        <p>Total Selling Value: <b>₹{totalSellingValue}</b></p>
                        <p style={{ color: "green" }}>
                            Total Profit: <b>₹{totalProfit}</b>
                        </p>
                    </div>
                </div>

                <button onClick={handleSave}>Save Stock</button>
            </div>

            <div style={{
                margin: "20px 0",
                padding: "15px",
                backgroundColor: "#e0e0e0",
                borderRadius: "5px"
            }}>
                <h2>Existing Stocks</h2>
                <StockList />
            </div>
        </div>
    );
};

export default StockInventory;