import React from "react";

import {
    hasFeature
} from "../utils/subscription";

import {
    Link
} from "react-router-dom";

const FeatureGate = ({
    user,
    feature,
    children,
    title = "Premium Feature",
    description = "Upgrade your plan to access this feature."
}) => {

    // ==========================
    // ACCESS GRANTED
    // ==========================

    if (
        hasFeature(user, feature)
    ) {

        return children;
    }

    // ==========================
    // BLOCKED
    // ==========================

    return (

        <div
            style={{
                background:
                    "rgba(255,255,255,0.05)",

                border:
                    "1px solid rgba(255,255,255,0.08)",

                borderRadius: "18px",

                padding: "30px",

                textAlign: "center",

                color: "#fff",

                marginTop: "20px"
            }}
        >

            <h2>

                🔒 {title}

            </h2>

            <p
                style={{
                    color: "#cbd5e1",
                    marginTop: "10px"
                }}
            >

                {description}

            </p>

            <Link
                to="/subscription-expired"
            >

                <button
                    style={{

                        marginTop: "20px",

                        padding:
                            "12px 24px",

                        border: "none",

                        borderRadius: "12px",

                        background:
                            "#2563eb",

                        color: "#fff",

                        fontWeight: "bold",

                        cursor: "pointer"
                    }}
                >

                    Upgrade Plan

                </button>

            </Link>

        </div>
    );
};

export default FeatureGate;