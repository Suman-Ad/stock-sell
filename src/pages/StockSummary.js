import React from "react";

const StockSummary = ({ stocks }) => {

    let totalItems = stocks.length;
    let totalQty = 0;
    let totalInvestment = 0;
    let totalSelling = 0;
    let totalProfit = 0;

    stocks.forEach(item => {
        Object.values(item.sizes || {}).forEach(s => {

            const qty = Number(s.qty || 0);
            const buying = Number(s.buyingPrice || 0);
            const selling = Number(s.sellingPrice || 0);

            const extra =
                Number(s.extraCosts?.packaging || 0) +
                Number(s.extraCosts?.labeling || 0) +
                Number(s.extraCosts?.rto || 0) +
                Number(s.extraCosts?.returnCost || 0) +
                Number(s.extraCosts?.advertisementCost || 0) +
                Number(s.extraCosts?.delivery || 0) +
                Number(s.extraCosts?.others || 0);

            const gstPercent = Number(s.extraCosts?.gst || 0);

            // remove GST from selling
            const sellingWithoutGST = selling / (1 + gstPercent / 100);

            const profitPerUnit = buying * Number(s.margin) / 100;

            totalQty += qty;
            totalInvestment += qty * buying;
            totalSelling += qty * selling;
            totalProfit += qty * profitPerUnit;

        });
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
            <p>Total Investment: ₹{totalInvestment.toFixed(0)}</p>
            <p>Total Selling Value: ₹{totalSelling.toFixed(0)}</p>
            <p style={{ color: totalProfit < 0 ? "red" : "lightgreen" }}>
                Total Profit: ₹{totalProfit.toFixed(0)}
            </p>
        </div>
    );
};

export default StockSummary;