import React from "react";

const StockSummary = ({ stocks }) => {

    const getTotalQty = (sizes) => {
        return Object.values(sizes || {}).reduce(
            (sum, s) => sum + (s.qty || 0),
            0
        );
    };

    let totalItems = stocks.length;
    let totalQty = 0;
    let totalInvestment = 0;
    let totalSelling = 0;
    let totalProfit = 0;

    stocks.forEach(item => {
        const qty = getTotalQty(item.sizes);
        const buying = item.buyingPrice || 0;
        const margin = item.margin || 0;

        totalQty += qty;
        totalInvestment += qty * buying;
        totalSelling += qty * (buying + margin);
        totalProfit += qty * margin;
    });

    return (
        <div style={{
            padding: "15px",
            background: "#111",
            color: "#fff",
            borderRadius: "10px",
            marginBottom: "20px"
        }}>
            <h3>📊 Inventory Summary</h3>

            <p>Total Products: {totalItems}</p>
            <p>Total Quantity: {totalQty}</p>
            <p>Total Investment: ₹{totalInvestment}</p>
            <p>Total Selling Value: ₹{totalSelling}</p>
            <p style={{ color: "lightgreen" }}>
                Total Profit: ₹{totalProfit}
            </p>
        </div>
    );
};

export default StockSummary;