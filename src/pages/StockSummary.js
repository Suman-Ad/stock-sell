import React from "react";
import "../assets/StockSummery.css";
import FeatureGate from "../components/FeatureGate";

const StockSummary = ({ stocks, user }) => {

    let totalItems = stocks.length;
    let totalQty = 0;
    let totalInvestment = 0;
    let totalExtraCost = 0;
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
            totalExtraCost += qty * extra;
            totalSelling += qty * selling;
            totalProfit += qty * profitPerUnit;

        });
    });

    return (
        <div className="summary-container">
            <h3 className="summary-title">📊 Inventory Summary</h3>
            <FeatureGate
                user={user}
                feature="inventorySummary"
                title="Inventory Summary"
                description="Upgrade your plan to unlock Inventory Summary."
            >
                <div className="summary-grid">

                    <div className="summary-card">
                        <span>Total Products</span>
                        <h2>{totalItems}</h2>
                    </div>

                    <div className="summary-card">
                        <span>Total Quantity</span>
                        <h2>{totalQty}</h2>
                    </div>

                    <div className="summary-card">
                        <span>Total Investment</span>
                        <h2>₹{totalInvestment.toFixed(0)}</h2>
                    </div>

                    <div className="summary-card">
                        <span>Total Extra Cost</span>
                        <h2>₹{totalExtraCost.toFixed(0)}</h2>
                    </div>

                    <div className="summary-card">
                        <span>Total Selling</span>
                        <h2>₹{totalSelling.toFixed(0)}</h2>
                    </div>

                    <div className={`summary-card ${totalProfit < 0 ? "loss" : "profit"}`}>
                        <span>Total Profit</span>
                        <h2>₹{totalProfit.toFixed(0)}</h2>
                    </div>

                </div>
            </FeatureGate>

        </div>
    );
};

export default StockSummary;