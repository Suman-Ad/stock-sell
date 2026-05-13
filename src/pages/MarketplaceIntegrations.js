import React, { useEffect, useState } from "react";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

const defaultPlatforms = {

    amazon: {
        connected: false,

        authType: "token",

        sellerId: "",

        marketplaceId: "",

        refreshToken: "",

        accessToken: "",

        tokenExpiry: null,

        lastSync: null,

        syncEnabled: false,

        health: "inactive"
    },

    flipkart: {
        connected: false,

        authType: "api",

        apiKey: "",

        secretKey: "",

        lastSync: null,

        syncEnabled: false,

        health: "inactive"
    },

    meesho: {
        connected: false,

        authType: "manual",

        email: "",

        lastUpload: null,

        syncEnabled: false,

        health: "inactive"
    },

    shopify: {
        connected: false,

        authType: "oauth",

        storeName: "",

        accessToken: "",

        scopes: [],

        lastSync: null,

        syncEnabled: false,

        health: "inactive"
    },

    woocommerce: {
        connected: false,

        authType: "api",

        storeUrl: "",

        consumerKey: "",

        consumerSecret: "",

        lastSync: null,

        syncEnabled: false,

        health: "inactive"
    }
};

const platformMeta = {
    amazon: {
        title: "Amazon",
        icon: "📦",
        color: "#ff9900"
    },

    flipkart: {
        title: "Flipkart",
        icon: "🛒",
        color: "#2874f0"
    },

    meesho: {
        title: "Meesho",
        icon: "🛍",
        color: "#e91e63"
    },

    shopify: {
        title: "Shopify",
        icon: "🏪",
        color: "#95bf47"
    },

    woocommerce: {
        title: "WooCommerce",
        icon: "🌐",
        color: "#7f54b3"
    }
};

const sensitiveFields = [
    "refreshToken",
    "accessToken",
    "secretKey",
    "consumerSecret",
    "consumerKey",
    "apiKey"
];

const MarketplaceIntegrations = ({ user }) => {

    const [platforms, setPlatforms] =
        useState(defaultPlatforms);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    // ========================================
    // LOAD USER MARKETPLACE DATA
    // ========================================

    useEffect(() => {

        if (!user?.uid) return;

        loadMarketplaceAccounts();

    }, [user]);

    const loadMarketplaceAccounts = async () => {

        try {

            const ref = doc(
                db,
                "marketplace_accounts",
                user.uid
            );

            const snap = await getDoc(ref);

            if (snap.exists()) {

                setPlatforms({
                    ...defaultPlatforms,
                    ...snap.data().platforms
                });

            }

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }
    };

    // ========================================
    // UPDATE FIELD
    // ========================================

    const updateField = (
        platform,
        field,
        value
    ) => {

        setPlatforms(prev => ({
            ...prev,

            [platform]: {
                ...prev[platform],

                [field]: value
            }
        }));
    };

    // ========================================
    // TOGGLE CONNECTION
    // ========================================

    const toggleConnection = (platform) => {

        setPlatforms(prev => ({
            ...prev,

            [platform]: {
                ...prev[platform],

                connected:
                    !prev[platform].connected
            }
        }));
    };

    // ========================================
    // SAVE
    // ========================================

    const savePlatforms = async () => {

        try {

            setSaving(true);

            await setDoc(
                doc(
                    db,
                    "marketplace_accounts",
                    user.uid
                ),
                {
                    userId: user.uid,

                    userName:
                        user.displayName || "",

                    userEmail:
                        user.email || "",

                    platforms,

                    updatedAt:
                        serverTimestamp()
                },
                { merge: true }
            );

            alert(
                "Marketplace accounts saved successfully"
            );

        } catch (err) {

            console.error(err);

            alert("Save failed");

        } finally {

            setSaving(false);

        }
    };

    // ========================================
    // TEST CONNECTION
    // ========================================

    const testConnection = (platform) => {

        const data = platforms[platform];

        const hasValue =
            Object.entries(data)
                .filter(([k]) =>
                    k !== "connected"
                )
                .some(([, v]) => v);

        if (!hasValue) {

            alert(
                "Please fill platform credentials first"
            );

            return;
        }

        alert(
            `${platformMeta[platform].title} connection test successful (Demo)`
        );
    };

    // ========================================
    // RENDER
    // ========================================

    if (loading) {

        return (
            <div
                style={{
                    padding: "40px",
                    textAlign: "center"
                }}
            >
                Loading Marketplace Integrations...
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "20px"
            }}
        >

            <div
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "10px"
                }}
            >

                <div>
                    <h2>
                        Marketplace Integrations
                    </h2>

                    <p>
                        Connect your seller accounts
                        and manage all platforms
                        centrally.
                    </p>
                </div>

                <button
                    onClick={savePlatforms}
                    disabled={saving}
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#2563eb",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    {saving
                        ? "Saving..."
                        : "💾 Save Integrations"}
                </button>

            </div>

            {/* ========================================
                PLATFORM GRID
            ======================================== */}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit,minmax(340px,1fr))",
                    gap: "20px"
                }}
            >

                {Object.entries(platforms).map(
                    ([platformKey, data]) => {

                        const meta =
                            platformMeta[platformKey];

                        return (
                            <div
                                key={platformKey}
                                style={{
                                    border:
                                        "1px solid #333",
                                    borderRadius: "16px",
                                    padding: "20px",
                                    background:
                                        "#111827",
                                    boxShadow:
                                        "0 10px 25px rgba(0,0,0,0.3)"
                                }}
                            >

                                {/* HEADER */}

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems: "center",
                                        marginBottom: "15px"
                                    }}
                                >

                                    <div>

                                        <div
                                            style={{
                                                fontSize: "24px"
                                            }}
                                        >
                                            {meta.icon}
                                        </div>

                                        <div
                                            style={{
                                                fontWeight:
                                                    "bold",
                                                fontSize: "18px",
                                                color:
                                                    meta.color
                                            }}
                                        >
                                            {meta.title}
                                        </div>

                                    </div>

                                    <div
                                        style={{
                                            padding:
                                                "6px 12px",
                                            borderRadius:
                                                "999px",

                                            background:
                                                data.connected
                                                    ? "#16a34a"
                                                    : "#dc2626",

                                            color: "#fff",

                                            fontSize: "12px",

                                            fontWeight:
                                                "bold"
                                        }}
                                    >
                                        {data.connected
                                            ? "CONNECTED"
                                            : "DISCONNECTED"}
                                        <div
                                            style={{
                                                marginTop: "8px",
                                                fontSize: "11px",
                                                color:
                                                    data.health === "healthy"
                                                        ? "#22c55e"
                                                        : data.health === "warning"
                                                            ? "#f59e0b"
                                                            : "#9ca3af"
                                            }}
                                        >
                                            Health: {data.health}
                                        </div>
                                    </div>

                                </div>

                                {/* FORM */}

                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection:
                                            "column",
                                        gap: "10px"
                                    }}
                                >

                                    {Object.entries(data)
                                        .filter(
                                            ([field]) =>
                                                field !==
                                                "connected"
                                        )
                                        .map(
                                            ([
                                                field,
                                                value
                                            ]) => (

                                                <div
                                                    key={field}
                                                >

                                                    <label
                                                        style={{
                                                            display:
                                                                "block",
                                                            marginBottom:
                                                                "4px",
                                                            fontSize:
                                                                "12px"
                                                        }}
                                                    >
                                                        {field}
                                                    </label>

                                                    <input
                                                        type={
                                                            sensitiveFields.includes(field)
                                                                ? "password"
                                                                : "text"
                                                        }
                                                        value={
                                                            value
                                                        }

                                                        onChange={(
                                                            e
                                                        ) =>
                                                            updateField(
                                                                platformKey,
                                                                field,
                                                                e.target.value
                                                            )
                                                        }

                                                        placeholder={`Enter ${field}`}

                                                        style={{
                                                            width:
                                                                "100%",
                                                            padding:
                                                                "10px",
                                                            borderRadius:
                                                                "8px",
                                                            border:
                                                                "1px solid #444",
                                                            background:
                                                                "#1f2937",
                                                            color:
                                                                "#fff"
                                                        }}
                                                    />

                                                </div>
                                            )
                                        )}

                                    <div
                                        style={{
                                            marginTop: "15px",
                                            fontSize: "12px",
                                            color: "#9ca3af"
                                        }}
                                    >

                                        Last Sync:
                                        {" "}
                                        {data.lastSync
                                            ? new Date(
                                                data.lastSync.seconds * 1000
                                            ).toLocaleString()
                                            : "Never"}

                                    </div>

                                </div>

                                {/* ACTIONS */}

                                <div
                                    style={{
                                        display: "flex",
                                        gap: "10px",
                                        marginTop: "20px",
                                        flexWrap: "wrap"
                                    }}
                                >

                                    <button
                                        onClick={() =>
                                            toggleConnection(
                                                platformKey
                                            )
                                        }

                                        style={{
                                            flex: 1,
                                            padding:
                                                "10px",
                                            border:
                                                "none",
                                            borderRadius:
                                                "8px",

                                            background:
                                                data.connected
                                                    ? "#dc2626"
                                                    : "#16a34a",

                                            color: "#fff",

                                            fontWeight:
                                                "bold",

                                            cursor:
                                                "pointer"
                                        }}
                                    >
                                        {data.connected
                                            ? "Disconnect"
                                            : "Connect"}
                                    </button>

                                    <button
                                        onClick={() =>
                                            testConnection(
                                                platformKey
                                            )
                                        }

                                        style={{
                                            flex: 1,
                                            padding:
                                                "10px",
                                            border:
                                                "none",
                                            borderRadius:
                                                "8px",

                                            background:
                                                "#2563eb",

                                            color: "#fff",

                                            fontWeight:
                                                "bold",

                                            cursor:
                                                "pointer"
                                        }}
                                    >
                                        Test Connection
                                    </button>

                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginTop: "10px",
                                            fontSize: "13px"
                                        }}
                                    >

                                        <input
                                            type="checkbox"

                                            checked={data.syncEnabled}

                                            onChange={(e) =>
                                                updateField(
                                                    platformKey,
                                                    "syncEnabled",
                                                    e.target.checked
                                                )
                                            }
                                        />

                                        Enable Auto Sync

                                    </label>

                                </div>

                            </div>
                        );
                    }
                )}

            </div>

        </div>
    );
};

export default MarketplaceIntegrations;