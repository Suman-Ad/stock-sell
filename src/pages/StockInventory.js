import React, { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import StockList from "./StockList";

const StockInventory = () => {
  const [itemType, setItemType] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState([
    { size: "S", qty: 0 },
    { size: "M", qty: 0 },
    { size: "L", qty: 0 }
  ]);
  const [buyingPrice, setBuyingPrice] = useState("");
  const [margin, setMargin] = useState("");
  const [remarks, setRemarks] = useState("");

  // Handle size qty change
  const handleSizeChange = (index, value) => {
    const updated = [...sizes];
    updated[index].qty = Number(value);
    setSizes(updated);
  };

  // Add new size row
  const addSizeRow = () => {
    setSizes([...sizes, { size: "", qty: 0 }]);
  };

  // Handle size name change
  const handleSizeNameChange = (index, value) => {
    const updated = [...sizes];
    updated[index].size = value;
    setSizes(updated);
  };

  // Save to Firestore
  const handleSave = async () => {
    try {
      const user = auth.currentUser;

      const sizeObject = {};
      sizes.forEach((s) => {
        if (s.size) {
          sizeObject[s.size] = { qty: s.qty };
        }
      });

      const catalogId = `${itemType}-${color}`;

      await addDoc(collection(db, "stocks"), {
        catalogId,
        sizes: sizeObject,
        buyingPrice: Number(buyingPrice),
        margin: Number(margin),
        remarks,
        userId: user.uid,
        createdAt: new Date()
      });

      alert("Stock Saved!");

      // Reset form
      setItemType("");
      setColor("");
      setSizes([{ size: "S", qty: 0 }]);
      setBuyingPrice("");
      setMargin("");
      setRemarks("");

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Stock Inventory</h2>

      {/* Catalog */}
      <input
        placeholder="Item Type (Shirt)"
        value={itemType}
        onChange={(e) => setItemType(e.target.value)}
      />
      <input
        placeholder="Color (Red)"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />

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

      <button onClick={handleSave}>Save Stock</button>
      <StockList />
    </div>
  );
};

export default StockInventory;