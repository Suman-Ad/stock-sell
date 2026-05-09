import React, {
    useEffect,
    useState
} from "react";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
    query,
    where
} from "firebase/firestore";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";

import {
    db,
    storage
} from "../firebase";

import "../assets/Signup.css";



const PlansPage = ({ user }) => {
    const paymentInfo = {
        upiId: "9647255367@sbi",
        merchant: "Stock Sell App"
    };
    const [transactionIds, setTransactionIds] =
        useState({});

    // ==========================
    // STATES
    // ==========================

    const [plans, setPlans] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [selectedPlan, setSelectedPlan] =
        useState(null);

    const [paymentFiles, setPaymentFiles] =
        useState({});

    const [existingRequest, setExistingRequest] =
        useState(null);

    // ==========================
    // LOAD DATA
    // ==========================

    useEffect(() => {

        loadPlans();

        if (user?.uid) {

            checkExistingRequest();

        }

    }, [user]);

    // ==========================
    // LOAD PLANS
    // ==========================

    const loadPlans = async () => {

        try {

            const snap =
                await getDocs(
                    collection(
                        db,
                        "plans"
                    )
                );

            const data =
                snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

            // active plans only
            const activePlans =
                data.filter(
                    p => p.active !== false
                );

            setPlans(activePlans);

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);

        }
    };

    // ==========================
    // CHECK EXISTING REQUEST
    // ==========================

    const checkExistingRequest =
        async () => {

            try {

                const q = query(
                    collection(
                        db,
                        "subscriptionRequests"
                    ),
                    where(
                        "userId",
                        "==",
                        user.uid
                    ),
                    where(
                        "status",
                        "==",
                        "pending"
                    )
                );

                const snap =
                    await getDocs(q);

                if (!snap.empty) {

                    setExistingRequest(
                        snap.docs[0].data()
                    );
                }

            } catch (err) {

                console.log(err);

            }
        };


    // ==========================
    // Transaction ID
    // ==========================

    const handleTransactionIdChange =
        (planId, value) => {

            setTransactionIds(prev => ({
                ...prev,
                [planId]: value.toUpperCase()
            }));
        };

    // ==========================
    // FILE CHANGE
    // ==========================

    const handleFileChange =
        (planId, file) => {

            setPaymentFiles(prev => ({
                ...prev,
                [planId]: file
            }));
        };

    // ==========================
    // SELECT PLAN
    // ==========================

    const handleSelectPlan = async (plan) => {

        try {

            // ======================
            // LOGIN CHECK
            // ======================

            if (!user?.uid) {

                alert("Please login first");

                return;
            }

            // ======================
            // VALIDATE FILE
            // ======================

            const paymentFile =
                paymentFiles[plan.id];

            if (!paymentFile) {

                alert(
                    "Please upload payment screenshot."
                );

                return;
            }

            const transactionId =
                transactionIds[plan.id];

            if (
                !transactionId ||
                transactionId.length < 6
            ) {

                alert("Enter transaction ID");

                return;
            }

            if (
                paymentFile.size >
                5 * 1024 * 1024
            ) {

                alert(
                    "File size must be under 5MB"
                );

                return;
            }

            setSelectedPlan(
                plan.id
            );

            if (
                !paymentFile.type.startsWith("image/")
            ) {

                alert("Only image files allowed");

                return;
            }

            // ======================
            // PREVENT MULTIPLE PENDING REQUESTS
            // ======================

            const existingPending = await getDocs(
                query(
                    collection(db, "subscriptionRequests"),
                    where("userId", "==", user.uid),
                    where("status", "==", "pending")
                )
            );

            if (!existingPending.empty) {

                alert(
                    "You already have a pending request."
                );

                return;
            }

            // ======================
            // UPLOAD IMAGE
            // ======================

            const fileName =
                `payments/${user.uid}_${Date.now()}_${paymentFile.name}`;

            const storageRef =
                ref(
                    storage,
                    fileName
                );

            await uploadBytes(
                storageRef,
                paymentFile
            );

            const paymentImage =
                await getDownloadURL(
                    storageRef
                );

            // ======================
            // SAVE REQUEST
            // ======================

            await addDoc(
                collection(
                    db,
                    "subscriptionRequests"
                ),
                {
                    userId:
                        user.uid,

                    userName:
                        user.displayName || "",

                    userEmail:
                        user.email || "",

                    currentPlan:
                        user.subscription?.planName || "free",

                    planId:
                        plan.planId || plan.id,

                    planName:
                        plan.planName,

                    price:
                        plan.price || 0,

                    duration:
                        plan.durationDays || 30,

                    features:
                        plan.features || {},

                    paymentImage,

                    transactionId,

                    paymentMethod: "UPI",

                    paymentStatus: "pending_verification",

                    status:
                        "pending",

                    createdAt:
                        serverTimestamp()
                }
            );

            alert(
                "Subscription request submitted successfully!"
            );

            setExistingRequest({
                planName:
                    plan.planName
            });

        } catch (err) {

            console.log(err);

            alert(err.message);

        } finally {

            setSelectedPlan(null);

        }
    };

    // ==========================
    // LOADING
    // ==========================

    if (loading) {

        return (

            <div className="auth-container">

                <div className="auth-box">

                    <h2>
                        Loading Plans...
                    </h2>

                </div>

            </div>
        );
    }

    // ==========================
    // PENDING REQUEST
    // ==========================

    if (existingRequest) {

        return (

            <div className="auth-container">

                <div
                    className="auth-box"
                    style={{
                        textAlign: "center"
                    }}
                >

                    <h2>
                        Request Pending
                    </h2>

                    <p
                        className="auth-subtitle"
                    >

                        Your subscription request
                        for
                        {" "}
                        <b>
                            {
                                existingRequest.planName
                            }
                        </b>
                        {" "}
                        is pending admin approval.

                    </p>

                    <p
                        style={{
                            color: "#cbd5e1"
                        }}
                    >

                        Please wait for verification.

                    </p>

                </div>

            </div>
        );
    }

    // ==========================
    // MAIN UI
    // ==========================

    return (

        <div className="auth-container">

            <div
                style={{
                    width: "100%",
                    maxWidth: "1200px"
                }}
            >

                {/* TITLE */}

                <div
                    style={{
                        textAlign: "center",
                        marginBottom: "40px"
                    }}
                >

                    <h1
                        style={{
                            color: "#fff",
                            fontSize: "42px"
                        }}
                    >

                        Choose Your Plan

                    </h1>

                    <p
                        style={{
                            color: "#cbd5e1",
                            marginTop: "10px"
                        }}
                    >

                        Upgrade your subscription
                        to unlock premium features.

                    </p>

                </div>

                {/* PLANS */}

                <div
                    style={{
                        display: "grid",

                        gridTemplateColumns:
                            "repeat(auto-fit,minmax(300px,1fr))",

                        gap: "25px"
                    }}
                >

                    {
                        plans.map(plan => (

                            <div
                                key={plan.id}
                                className="auth-box"
                                style={{
                                    position: "relative"
                                }}
                            >

                                {/* POPULAR */}

                                {
                                    plan.popular && (

                                        <div
                                            style={{
                                                position: "absolute",

                                                top: "-12px",

                                                right: "20px",

                                                background:
                                                    "#2563eb",

                                                color: "#fff",

                                                padding:
                                                    "6px 14px",

                                                borderRadius:
                                                    "30px",

                                                fontSize: "13px",

                                                fontWeight: "bold"
                                            }}
                                        >

                                            MOST POPULAR

                                        </div>
                                    )
                                }

                                {/* PLAN NAME */}

                                <h2
                                    style={{
                                        color: "#fff"
                                    }}
                                >

                                    {plan.planName}

                                </h2>

                                {/* PRICE */}

                                <div
                                    style={{
                                        marginTop: "20px"
                                    }}
                                >

                                    <span
                                        style={{
                                            fontSize: "42px",
                                            color: "#60a5fa",
                                            fontWeight: "bold"
                                        }}
                                    >

                                        ₹{plan.price}

                                    </span>

                                </div>

                                {/* DURATION */}

                                <p
                                    style={{
                                        color: "#cbd5e1",
                                        marginTop: "10px"
                                    }}
                                >

                                    {plan.durationDays} Days Access

                                </p>

                                {/* FEATURES */}

                                <div
                                    style={{
                                        marginTop: "25px"
                                    }}
                                >

                                    {
                                        Object.entries(
                                            plan.features || {}
                                        ).map(
                                            ([key]) => (

                                                <div
                                                    key={key}
                                                    style={{
                                                        marginBottom: "12px",
                                                        color: "#fff"
                                                    }}
                                                >

                                                    ✅ {key}

                                                </div>
                                            )
                                        )
                                    }

                                </div>

                                {/* QR PAYMENT */}
                                <div
                                    style={{
                                        marginTop: "20px",
                                        padding: "15px",
                                        borderRadius: "12px",
                                        background: "#0f172a",
                                        border: "1px solid #334155",
                                        textAlign: "center"
                                    }}
                                >

                                    <img
                                        src="/UPI.png"
                                        alt="UPI QR"
                                        style={{
                                            width: "180px",
                                            borderRadius: "12px"
                                        }}
                                    />

                                    <p
                                        style={{
                                            marginTop: "10px",
                                            color: "#cbd5e1",
                                            fontSize: "14px"
                                        }}
                                    >
                                        UPI ID: {paymentInfo.upiId}
                                    </p>

                                </div>

                                <input
                                    type="text"
                                    placeholder="Enter UPI Transaction ID"
                                    value={transactionIds[plan.id] || ""}
                                    onChange={(e) =>
                                        handleTransactionIdChange(
                                            plan.id,
                                            e.target.value
                                        )
                                    }
                                    style={{
                                        marginTop: "12px",
                                        width: "100%",
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "1px solid #334155",
                                        background: "#0f172a",
                                        color: "#fff"
                                    }}
                                />

                                <div
                                    style={{
                                        marginTop: "25px"
                                    }}
                                >

                                    <p
                                        style={{
                                            color: "#cbd5e1",
                                            marginBottom: "10px"
                                        }}
                                    >

                                        Upload Payment Screenshot

                                    </p>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handleFileChange(
                                                plan.id,
                                                e.target.files[0]
                                            )
                                        }
                                        style={{
                                            color: "#fff",
                                            width: "100%"
                                        }}
                                    />

                                    {
                                        paymentFiles[plan.id] && (

                                            <img
                                                src={
                                                    URL.createObjectURL(
                                                        paymentFiles[plan.id]
                                                    )
                                                }
                                                alt="preview"
                                                style={{
                                                    width: "100%",
                                                    marginTop: "12px",
                                                    borderRadius: "10px",
                                                    maxHeight: "220px",
                                                    objectFit: "cover"
                                                }}
                                            />

                                        )
                                    }

                                </div>

                                {/* BUTTON */}

                                <button
                                    className="auth-btn"
                                    style={{
                                        marginTop: "25px"
                                    }}
                                    onClick={() =>
                                        handleSelectPlan(plan)
                                    }
                                    disabled={
                                        selectedPlan === plan.id
                                    }
                                >

                                    {
                                        selectedPlan === plan.id
                                            ? "Processing..."
                                            : `Subscribe ${plan.planName}`
                                    }

                                </button>

                            </div>
                        ))
                    }

                </div>
                {
                    user?.subscription && (

                        <div
                            className="auth-box"
                            style={{
                                marginBottom: "30px"
                            }}
                        >

                            <h3
                                style={{
                                    color: "#fff"
                                }}
                            >
                                Current Subscription
                            </h3>

                            <p
                                style={{
                                    color: "#cbd5e1"
                                }}
                            >
                                Plan:
                                {" "}
                                <b>
                                    {
                                        user.subscription.planName
                                    }
                                </b>
                            </p>

                            <p
                                style={{
                                    color: "#cbd5e1"
                                }}
                            >
                                Status:
                                {" "}
                                <b>
                                    {
                                        user.subscription.status
                                    }
                                </b>
                            </p>

                        </div>
                    )
                }

            </div>



        </div>
    );
};

export default PlansPage;