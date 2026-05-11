// src/pages/SubscriptionManager.js

import React, { useEffect, useMemo, useState } from "react";
import {
    collection,
    doc,
    getDocs,
    updateDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import "../assets/SubscriptionManager.css";


const SubscriptionManager = () => {

    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [planFilter, setPlanFilter] = useState("all");
    const [updating, setUpdating] = useState("");
    const [requests, setRequests] = useState([]);

    // ==============================
    // Load Users
    // ==============================
    // ==============================
    // REALTIME REQUESTS
    // ==============================

    useEffect(() => {

        const unsubUsers = onSnapshot(
            collection(db, "users"),
            (snap) => {

                const data = snap.docs.map(docItem => ({
                    id: docItem.id,
                    ...docItem.data()
                }));

                setUsers(data);

                setLoading(false);
            }
        );

        const unsubRequests = onSnapshot(
            collection(db, "subscriptionRequests"),
            (snap) => {

                const data = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

                setRequests(data);
            }
        );

        // ==========================
        // LOAD PLANS
        // ==========================

        const unsubPlans = onSnapshot(
            collection(db, "plans"),
            (snap) => {

                const data = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

                // active only
                const activePlans = data.filter(
                    p => p.active !== false
                );

                setPlans(activePlans);
            }
        );

        return () => {

            unsubUsers();
            unsubRequests();
            unsubPlans();

        };

    }, []);

    // ==============================
    // Approve Request
    // ==============================

    const approveRequest = async (request) => {

        try {

            setUpdating(request.userId);

            const selectedPlan = plans.find(
                p =>
                    p.planId === request.planId ||
                    p.id === request.planId
            );

            if (!selectedPlan) {

                alert("Invalid plan");

                return;
            }

            const startDate = new Date();

            const endDate = new Date();

            endDate.setDate(
                endDate.getDate() +
                selectedPlan.durationDays
            );

            // =========================
            // UPDATE USER SUBSCRIPTION
            // =========================

            await updateDoc(
                doc(db, "users", request.userId),
                {
                    subscription: {

                        ...selectedPlan,

                        billingCycle: "monthly",

                        currency: "INR",

                        status: "active",

                        paymentStatus:
                            Number(selectedPlan.price) <= 0
                                ? "free"
                                : "paid",
                        maxProducts:
                            selectedPlan.maxProducts ?? -1,

                        maxUsers:
                            selectedPlan.maxUsers ?? 1,

                        autoRenew: false,

                        startDate,

                        endDate,

                        updatedAt: serverTimestamp()
                    }
                }
            );

            // =========================
            // UPDATE REQUEST STATUS
            // =========================

            // APPROVE CURRENT REQUEST

            await updateDoc(
                doc(db, "subscriptionRequests", request.id),
                {
                    status: "approved",
                    approvedAt: serverTimestamp()
                }
            );

            // AUTO REJECT OTHER PENDING REQUESTS

            const pendingSnap = await getDocs(
                query(
                    collection(db, "subscriptionRequests"),
                    where("userId", "==", request.userId),
                    where("status", "==", "pending")
                )
            );

            for (const pendingDoc of pendingSnap.docs) {

                if (pendingDoc.id !== request.id) {

                    await updateDoc(
                        doc(db, "subscriptionRequests", pendingDoc.id),
                        {
                            status: "auto_rejected",
                            rejectedAt: serverTimestamp()
                        }
                    );

                }
            }

            alert("Subscription approved");

        } catch (err) {

            console.log(err);

            alert(err.message);

        } finally {

            setUpdating("");

        }
    };

    // ==============================
    // Reject Request
    // ==============================


    const rejectRequest = async (requestId) => {

        try {

            await updateDoc(
                doc(
                    db,
                    "subscriptionRequests",
                    requestId
                ),
                {
                    status: "rejected",

                    rejectedAt: serverTimestamp()
                }
            );

            alert("Request rejected");

        } catch (err) {

            alert(err.message);

        }
    };


    // ==============================
    // Search Filter
    // ==============================

    const filteredUsers = useMemo(() => {

        return users.filter(user => {

            const text = `
            ${user.name || ""}
            ${user.email || ""}
            ${user.shopName || ""}
        `.toLowerCase();

            const matchesSearch =
                text.includes(search.toLowerCase());

            const currentPlan =
                user?.subscription?.planId ||
                user?.subscription?.id ||
                "";

            let matchesPlan = true;

            if (planFilter === "no_plan") {

                matchesPlan = !currentPlan;

            } else if (planFilter === "admin") {

                matchesPlan = planFilter;

            } else if (planFilter !== "all") {

                matchesPlan = currentPlan === planFilter;

            }

            return matchesSearch && matchesPlan;

        });

    }, [users, search, planFilter]);

    // ==============================
    // Update Plan
    // ==============================

    const handlePlanChange = async (userId, planKey) => {

        try {

            const confirmChange = window.confirm(
                `Change subscription to ${planKey.toUpperCase()} ?`
            );

            if (!confirmChange) return;

            setUpdating(userId);

            const selectedPlan = plans.find(
                p =>
                    p.planId === planKey ||
                    p.id === planKey
            );

            if (!selectedPlan) {

                alert("Plan not found");

                return;
            }

            const startDate = new Date();

            const endDate = new Date();

            endDate.setDate(
                endDate.getDate() + selectedPlan.durationDays
            );

            await updateDoc(doc(db, "users", userId), {

                subscription: {

                    ...selectedPlan,

                    billingCycle: "monthly",

                    currency: "INR",

                    status: "active",

                    paymentStatus:
                        Number(selectedPlan.price) <= 0
                            ? "free"
                            : "paid",

                    maxProducts:
                        selectedPlan.maxProducts ?? -1,

                    maxUsers:
                        selectedPlan.maxUsers ?? 1,

                    autoRenew: false,

                    startDate,

                    endDate,

                    updatedAt: serverTimestamp()
                }
            });

            alert("Subscription updated!");


        } catch (err) {

            console.log(err);

            alert(err.message);

        } finally {

            setUpdating("");

        }
    };

    // ==============================
    // Activate / Deactivate
    // ==============================

    const toggleUserStatus = async (user) => {

        try {

            const newStatus = !user.isActive;

            await updateDoc(doc(db, "users", user.id), {
                isActive: newStatus
            });

            alert(
                newStatus
                    ? "User Activated"
                    : "User Deactivated"
            );


        } catch (err) {

            alert(err.message);

        }
    };

    // ==============================
    // Expire Subscription
    // ==============================

    const expireSubscription = async (userId) => {

        try {

            const confirmExpire = window.confirm(
                "Expire this subscription?"
            );

            if (!confirmExpire) return;

            await updateDoc(doc(db, "users", userId), {
                "subscription.status": "expired"
            });

            alert("Subscription expired");


        } catch (err) {

            alert(err.message);

        }
    };

    return (
        <div className="subscription-page">

            <div className="subscription-header">

                <h2>Subscription Manager</h2>

                <input
                    type="text"
                    placeholder="Search user..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    style={{
                        marginTop: "10px",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid #334155",
                        background: "#0f172a",
                        color: "#fff",
                        width: "100%",
                        maxWidth: "300px"
                    }}
                >
                    <option value="all">All Plans</option>
                    <option value="admin">Admin</option>

                    {plans.map(plan => (
                        <option
                            key={plan.id}
                            value={plan.planId || plan.id}
                        >
                            {plan.planName}
                        </option>
                    ))}

                    <option value="no_plan">No Plan</option>
                </select>

            </div>


            {loading ? (

                <p>Loading users...</p>

            ) : (

                <div className="subscription-grid">

                    {filteredUsers.map(user => {

                        const sub = user.subscription || {};
                        const userRequests =
                            requests.filter(
                                r =>
                                    r.userId === user.id &&
                                    r.status === "pending"
                            );

                        return (

                            <div
                                className="subscription-card"
                                key={user.id}
                            >

                                {
                                    userRequests.length > 0 && (
                                        <div
                                            style={{
                                                background: "#f59e0b",
                                                color: "#000",
                                                padding: "4px 8px",
                                                borderRadius: "20px",
                                                fontSize: "11px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {userRequests.length} Pending
                                        </div>
                                    )
                                }

                                <div className="card-top">

                                    <h3>{user.name}</h3>

                                    <span
                                        className={
                                            user.isActive
                                                ? "active-badge"
                                                : "inactive-badge"
                                        }
                                    >
                                        {user.isActive
                                            ? "ACTIVE"
                                            : "INACTIVE"}
                                    </span>

                                </div>

                                <p>
                                    <strong>Email:</strong> {user.email}
                                </p>

                                <p>
                                    <strong>Shop:</strong> {user.shopName}
                                </p>

                                <p>
                                    <strong>Current Plan:</strong>{" "}
                                    {sub.planName || "N/A"}
                                </p>

                                <p>
                                    <strong>Status:</strong>

                                    <span
                                        style={{
                                            color:
                                                sub.status === "active"
                                                    ? "#22c55e"
                                                    : sub.status === "expired"
                                                        ? "#ef4444"
                                                        : "#f59e0b",
                                            fontWeight: "bold",
                                            marginLeft: "5px"
                                        }}
                                    >
                                        {sub.status || "N/A"}
                                    </span>
                                </p>

                                <p>
                                    <strong>Products Limit:</strong>{" "}
                                    {sub.maxProducts}
                                </p>

                                <p>
                                    <strong>Users Limit:</strong>{" "}
                                    {sub.maxUsers}
                                </p>

                                <p>
                                    <strong>Expiry:</strong>{" "}
                                    {
                                        sub?.endDate?.toDate?.()
                                            ?.toLocaleDateString?.() || "N/A"
                                    }
                                </p>

                                {
                                    userRequests.length > 0 && (

                                        <div
                                            style={{
                                                marginTop: "15px",
                                                marginBottom: "15px",
                                                background: "#1e293b",
                                                border: "1px solid #f59e0b",
                                                borderRadius: "10px",
                                                padding: "12px"
                                            }}
                                        >

                                            <h4
                                                style={{
                                                    color: "#fbbf24",
                                                    marginBottom: "10px"
                                                }}
                                            >
                                                Pending Requests
                                            </h4>


                                            {
                                                userRequests.map(req => (

                                                    <div
                                                        key={req.id}
                                                        style={{
                                                            marginBottom: "12px",
                                                            paddingBottom: "12px",
                                                            borderBottom:
                                                                "1px solid #334155"
                                                        }}
                                                    >

                                                        <p>
                                                            <strong>Plan:</strong>
                                                            {" "}
                                                            {req.planName}
                                                        </p>

                                                        <p>
                                                            <strong>Price:</strong>
                                                            {" "}
                                                            ₹{req.price}
                                                        </p>

                                                        <p>
                                                            <strong>Transaction ID:</strong>
                                                            {" "}
                                                            {req.transactionId || "N/A"}
                                                        </p>

                                                        {
                                                            req.paymentImage && (

                                                                <div
                                                                    style={{
                                                                        marginTop: "10px"
                                                                    }}
                                                                >

                                                                    <p
                                                                        style={{
                                                                            marginBottom: "8px",
                                                                            fontSize: "13px",
                                                                            color: "#cbd5e1"
                                                                        }}
                                                                    >
                                                                        Payment Screenshot
                                                                    </p>

                                                                    <a
                                                                        href={req.paymentImage}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >

                                                                        <img
                                                                            src={req.paymentImage}
                                                                            alt="Payment"
                                                                            style={{
                                                                                width: "100%",
                                                                                maxHeight: "220px",
                                                                                objectFit: "cover",
                                                                                borderRadius: "12px",
                                                                                border: "1px solid #334155",
                                                                                cursor: "pointer"
                                                                            }}
                                                                        />

                                                                    </a>

                                                                </div>
                                                            )
                                                        }

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: "10px",
                                                                marginTop: "10px"
                                                            }}
                                                        >

                                                            <button
                                                                onClick={() =>
                                                                    approveRequest(req)
                                                                }
                                                            >
                                                                Approve
                                                            </button>

                                                            <button
                                                                className="expire-btn"
                                                                onClick={() =>
                                                                    rejectRequest(req.id)
                                                                }
                                                            >
                                                                Reject
                                                            </button>

                                                        </div>

                                                    </div>
                                                ))
                                            }

                                        </div>
                                    )
                                }

                                <div className="plan-buttons">

                                    {plans.map(plan => (

                                        <button
                                            key={plan.id}
                                            disabled={updating === user.id}
                                            className={
                                                sub.planId === plan.planId
                                                    ? "selected-plan"
                                                    : ""
                                            }
                                            onClick={() =>
                                                handlePlanChange(
                                                    user.id,
                                                    plan.planId || plan.id
                                                )
                                            }
                                        >
                                            {
                                                updating === user.id
                                                    ? "Updating..."
                                                    : plan.planName
                                            }
                                        </button>

                                    ))}

                                </div>

                                <div className="action-buttons">

                                    <button
                                        onClick={() =>
                                            toggleUserStatus(user)
                                        }
                                    >
                                        {
                                            user.isActive
                                                ? "Deactivate"
                                                : "Activate"
                                        }
                                    </button>

                                    <button
                                        className="expire-btn"
                                        onClick={() =>
                                            expireSubscription(user.id)
                                        }
                                    >
                                        Expire
                                    </button>

                                </div>

                            </div>

                        );

                    })}

                </div>

            )}

        </div>
    );
};

export default SubscriptionManager;