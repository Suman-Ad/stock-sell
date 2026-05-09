import React from "react";

import {
    Navigate
} from "react-router-dom";

import {
    isSubscriptionActive
} from "../utils/subscription";

const ProtectedRoute = ({
    user,
    children,
    requiredRole = null,
    loading = false
}) => {

    // ==========================
    // LOADING
    // ==========================

    if (loading) {

        return (

            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: "20px"
                }}
            >

                Loading...

            </div>

        );
    }

    // ==========================
    // NO LOGIN
    // ==========================

    if (!user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    // ==========================
    // EMAIL NOT VERIFIED
    // ==========================

    if (!user.emailVerified) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    // ==========================
    // ADMIN APPROVAL
    // ==========================

    if (!user.isActive) {

        return (

            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0f172a",
                    color: "#fff",
                    padding: "20px",
                    textAlign: "center"
                }}
            >

                <div>

                    <h2>
                        Account Pending Approval
                    </h2>

                    <p>
                        Please wait for admin approval.
                    </p>

                </div>

            </div>

        );
    }

    // ==========================
    // SUBSCRIPTION
    // ==========================

    if (
        !isSubscriptionActive(user)
    ) {

        return (

            <Navigate
                to="/subscription-expired"
                replace
            />

        );
    }

    // ==========================
    // ROLE PROTECTION
    // ==========================

    if (
        requiredRole &&
        user.role !== requiredRole
    ) {

        return (

            <Navigate
                to="/dashboard"
                replace
            />

        );
    }

    // ==========================
    // ALLOW
    // ==========================

    return children;
};

export default ProtectedRoute;