import React from "react";

import {
    hasFeature,
    isSubscriptionActive,
    getSubscription,
    isFreePlan
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
    // SUBSCRIPTION INFO
    // ==========================

    const sub =
        getSubscription(user);

    const active =
        isSubscriptionActive(user);

    const freePlan =
        isFreePlan(user);

    // ==========================
    // NOT LOGGED IN
    // ==========================

    if (!user) {

        return (

            <BlockedView
                title="Login Required"
                description="Please login to continue."
                buttonText="Login"
                link="/login"
            />

        );
    }

    // ==========================
    // EXPIRED / INACTIVE
    // ==========================

    if (!active) {

        return (

            <BlockedView
                title="Subscription Expired"
                description="Your subscription is inactive or expired."
                buttonText="Renew Subscription"
                link="/subscription-expired"
            />

        );
    }

    // ==========================
    // FREE PLAN BLOCK
    // ==========================

    if (freePlan) {

        return (

            <BlockedView
                title={title}
                description={description}
                buttonText="Upgrade Plan"
                link="/plans"
            />

        );
    }

    // ==========================
    // FEATURE NOT INCLUDED
    // ==========================

    return (

        <BlockedView
            title={`${title} Feature Not Included`}
            description={`Your ${sub.planName} plan does not include this feature.\n${description}`}
            buttonText="Upgrade Plan"
            link="/plans"
        />

    );
};

// ==============================
// BLOCKED VIEW
// ==============================

const BlockedView = ({
    title,
    description,
    buttonText,
    link
}) => {

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

            <Link to={link}>

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

                    {buttonText}

                </button>

            </Link>

        </div>
    );
};

export default FeatureGate;