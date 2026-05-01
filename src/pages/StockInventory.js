import React, { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import StockList from "./StockList";

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

const getSellingPrice = (buying, margin) => {
    return buying * (1 + margin / 100);
};

const StockInventory = () => {
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [productType, setProductType] = useState("");
    const [color, setColor] = useState("");
    const [customColor, setCustomColor] = useState("");
    const [sizes, setSizes] = useState([
        { size: "S", qty: 0, buyingPrice: 0, margin: 0 },
        { size: "M", qty: 0, buyingPrice: 0, margin: 0 },
        { size: "L", qty: 0, buyingPrice: 0, margin: 0 }
    ]);

    const [remarks, setRemarks] = useState("");

    const totalQty = sizes.reduce((sum, s) => sum + s.qty, 0);

    const totalInvestment = sizes.reduce(
        (sum, s) => sum + (s.qty * s.buyingPrice),
        0
    );

    const totalSellingValue = sizes.reduce(
        (sum, s) => sum + (s.qty * getSellingPrice(s.buyingPrice, s.margin)),
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
            { size: "", qty: 0, buyingPrice: 0, margin: 0 }
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

    // Save to Firestore
    const handleSave = async () => {
        try {
            const user = auth.currentUser;

            if (!user) {
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
                        sellingPrice: getSellingPrice(s.buyingPrice, s.margin)
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

            const catalogId = `${category}-${subCategory}-${productType}-${finalColor}`;

            await addDoc(collection(db, "stocks"), {
                category,
                subCategory,
                productType,
                color,
                catalogId,
                sizes: sizeObject,
                remarks,
                userId: user.uid,
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

    return (
        <div style={{ padding: "20px" }}>
            <div style={{
                marginBottom: "20px",
                padding: "15px",
                backgroundColor: "#f0f0f0",
                borderRadius: "5px"
            }}>
                <h2>Stock Inventory</h2>

                <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "5px", display: "flex", flexDirection: "row", gap: "15px" }}>
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

                <div style={{ display: "flex", flexDirection: "row", gap: "30px" }}>

                    <div style={{
                        marginBottom: "20px",
                        padding: "15px",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "5px"
                    }}>
                        <h4>Sizes - Quantity - Prices - Margin%</h4>

                        {sizes.map((s, index) => {
                            const selling = getSellingPrice(s.buyingPrice, s.margin);

                            return (
                                <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                                    <div>
                                        <label style={{ fontSize:"10px", color:"gray" }}>Size</label><br />
                                        <input
                                            placeholder="Size"
                                            value={s.size}
                                            onChange={(e) =>
                                                handleSizeNameChange(index, e.target.value)
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize:"10px", color:"gray" }}>Qty</label><br />
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
                                        <label style={{ fontSize:"10px", color:"gray" }}>Buying ₹</label><br />
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
                                        <label style={{ fontSize:"10px", color:"gray" }}>Margin %</label><br />
                                        <input
                                            type="number"
                                            placeholder="Margin %"
                                            value={s.margin}
                                            onChange={(e) =>
                                                handleMarginChange(index, e.target.value)
                                            }
                                        />
                                    </div>

                                    <span>₹{selling.toFixed(2)}</span>
                                    <span style={{ color: "green" }}>
                                        Profit: ₹{(selling - s.buyingPrice).toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}

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
                        marginTop: "20px",
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