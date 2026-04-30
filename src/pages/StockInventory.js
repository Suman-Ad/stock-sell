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

const StockInventory = () => {
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [productType, setProductType] = useState("");
    const [color, setColor] = useState("");
    const [customColor, setCustomColor] = useState("");
    const [sizes, setSizes] = useState([
        { size: "S", qty: 0 },
        { size: "M", qty: 0 },
        { size: "L", qty: 0 }
    ]);
    const [buyingPrice, setBuyingPrice] = useState("");
    const [margin, setMargin] = useState("");
    const [remarks, setRemarks] = useState("");

    const totalQty = sizes.reduce((sum, s) => sum + (s.qty || 0), 0);

    const buying = Number(buyingPrice) || 0;
    const marginValue = Number(margin) || 0;

    const sellingPrice = buying + marginValue;
    const totalInvestment = totalQty * buying;
    const totalProfit = totalQty * marginValue;
    const totalSellingValue = totalQty * sellingPrice;

    // Handle size qty change
    const handleSizeChange = (index, value) => {
        if (value < 0) return; // prevent negative
        const updated = [...sizes];
        updated[index].qty = Number(value);
        setSizes(updated);
    };

    // Add new size row
    const addSizeRow = () => {
        const last = sizes[sizes.length - 1];

        if (!last.size) {
            alert("Fill previous size first!");
            return;
        }

        setSizes([...sizes, { size: "", qty: 0 }]);
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
                    sizeObject[s.size] = { qty: Number(s.qty) || 0 };
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
                buyingPrice: Number(buyingPrice) || 0,
                margin: Number(margin) || 0,
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
            <h2>Stock Inventory</h2>
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

            <h4>Sizes & Quantity</h4>

            {sizes.map((s, index) => (
                <div key={index}>
                    <input
                        placeholder="Size"
                        value={s.size}
                        onChange={(e) =>
                            handleSizeNameChange(index, e.target.value)
                        }
                    />
                    <input
                        type="number"
                        placeholder="Qty"
                        value={s.qty}
                        onChange={(e) =>
                            handleSizeChange(index, e.target.value)
                        }
                    />
                </div>
            ))}

            <button onClick={addSizeRow}>+ Add Size</button>

            <br /><br />

            <input
                type="number"
                placeholder="Buying Price"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
            />

            <input
                type="number"
                placeholder="Selling Margin"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
            />

            <br /><br />

            <textarea
                placeholder="Remarks / Description"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
            />

            <br /><br />

            <div style={{
                marginTop: "20px",
                padding: "15px",
                background: "#f5f5f5",
                borderRadius: "8px"
            }}>
                <h4>📊 Live Summary</h4>

                <p>Total Quantity: <b>{totalQty}</b></p>
                <p>Selling Price (per item): <b>₹{sellingPrice}</b></p>
                <p>Total Investment: <b>₹{totalInvestment}</b></p>
                <p>Total Selling Value: <b>₹{totalSellingValue}</b></p>
                <p style={{ color: "green" }}>
                    Total Profit: <b>₹{totalProfit}</b>
                </p>
            </div>

            <button onClick={handleSave}>Save Stock</button>
            <StockList />
        </div>
    );
};

export default StockInventory;