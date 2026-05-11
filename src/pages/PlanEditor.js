import React, { useEffect, useState } from "react";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from "firebase/firestore";

import { db } from "../firebase";

const emptyPlan = {
    planName: "",
    price: "",
    durationDays: "",
    active: true,
    popular: false,
    featuresText: ""
};

const PlanEditor = () => {

    const [plans, setPlans] = useState([]);

    const [form, setForm] = useState(emptyPlan);

    const [editingId, setEditingId] = useState(null);

    const [selectedPlanId, setSelectedPlanId] = useState("free");

    // =========================
    // LOAD PLANS
    // =========================

    const loadPlans = async () => {

        const snap = await getDocs(collection(db, "plans"));

        const data = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        setPlans(data);

        // Auto select first tab
        if (data.length > 0 && !selectedPlanId) {
            setSelectedPlanId(data[0].id);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    // =========================
    // HANDLE CHANGE
    // =========================

    const handleChange = (e) => {

        const { name, value, type, checked } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: type === "checkbox"
                ? checked
                : value
        }));
    };

    // =========================
    // SAVE PLAN
    // =========================

    const handleSave = async () => {

        if (!form.planName) {
            alert("Enter plan name");
            return;
        }

        const features = {};

        form.featuresText
            .split("\n")
            .filter(Boolean)
            .forEach(item => {
                features[item.trim()] = true;
            });

        const payload = {
            planName: form.planName,
            price: Number(form.price),
            durationDays: Number(form.durationDays),
            active: form.active,
            popular: form.popular,
            features
        };

        try {

            if (editingId) {

                await updateDoc(
                    doc(db, "plans", editingId),
                    payload
                );

                alert("Plan updated");

            } else {

                await addDoc(
                    collection(db, "plans"),
                    payload
                );

                alert("Plan created");
            }

            setForm(emptyPlan);

            setEditingId(null);

            loadPlans();

        } catch (err) {

            console.log(err);

            alert(err.message);
        }
    };

    // =========================
    // EDIT
    // =========================

    const handleEdit = (plan) => {

        setEditingId(plan.id);

        setForm({
            planName: plan.planName || "",
            price: plan.price || "",
            durationDays: plan.durationDays || "",
            active: plan.active !== false,
            popular: plan.popular || false,
            featuresText: Object.keys(plan.features || {}).join("\n")
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // =========================
    // DELETE
    // =========================

    const handleDelete = async (id) => {

        const confirmDelete = window.confirm(
            "Delete this plan?"
        );

        if (!confirmDelete) return;

        try {

            await deleteDoc(doc(db, "plans", id));

            loadPlans();

        } catch (err) {

            console.log(err);

            alert(err.message);
        }
    };

    return (

        <div
            style={{
                padding: "30px",
                color: "#fff"
            }}
        >

            <h1>
                Plan Editor
            </h1>

            {/* FORM */}

            <div
                style={{
                    background: "#1e293b",
                    padding: "20px",
                    borderRadius: "12px",
                    marginTop: "20px"
                }}
            >

                <input
                    type="text"
                    name="planName"
                    placeholder="Plan Name"
                    value={form.planName}
                    onChange={handleChange}
                    style={inputStyle}
                />

                <input
                    type="number"
                    name="price"
                    placeholder="Price"
                    value={form.price}
                    onChange={handleChange}
                    style={inputStyle}
                />

                <input
                    type="number"
                    name="durationDays"
                    placeholder="Duration Days"
                    value={form.durationDays}
                    onChange={handleChange}
                    style={inputStyle}
                />

                <textarea
                    name="featuresText"
                    placeholder="Features (one per line)"
                    value={form.featuresText}
                    onChange={handleChange}
                    style={{
                        ...inputStyle,
                        height: "150px"
                    }}
                />

                <label style={{ display: "block", marginTop: "10px" }}>
                    <input
                        type="checkbox"
                        name="active"
                        checked={form.active}
                        onChange={handleChange}
                    />
                    {" "}Active
                </label>

                <label style={{ display: "block", marginTop: "10px" }}>
                    <input
                        type="checkbox"
                        name="popular"
                        checked={form.popular}
                        onChange={handleChange}
                    />
                    {" "}Popular Plan
                </label>

                <button
                    onClick={handleSave}
                    style={{
                        marginTop: "20px",
                        padding: "12px 20px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#2563eb",
                        color: "#fff",
                        cursor: "pointer"
                    }}
                >

                    {editingId
                        ? "Update Plan"
                        : "Create Plan"}

                </button>

            </div>


            {/* PLAN LIST */}

            <div
                style={{
                    marginTop: "40px"
                }}
            >

                {/* TAB BUTTONS */}

                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                        marginBottom: "25px"
                    }}
                >

                    {plans.map(plan => (

                        <button
                            key={plan.id}
                            onClick={() =>
                                setSelectedPlanId(plan.id)
                            }
                            style={{
                                padding: "12px 18px",
                                borderRadius: "10px",
                                border: "1px solid #334155",
                                background:
                                    selectedPlanId === plan.id
                                        ? "#2563eb"
                                        : "#0f172a",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: "600",
                                transition: "0.3s"
                            }}
                        >
                            {plan.planName}
                        </button>

                    ))}

                </div>

                {/* SELECTED PLAN */}

                {plans
                    .filter(plan => plan.id === selectedPlanId)
                    .map(plan => (

                        <div
                            key={plan.id}
                            style={{
                                background: "#0f172a",
                                padding: "25px",
                                borderRadius: "16px",
                                border: "1px solid #334155"
                            }}
                        >

                            <h2
                                style={{
                                    marginBottom: "10px"
                                }}
                            >
                                {plan.planName}
                            </h2>

                            <p>
                                <strong>Price:</strong> ₹{plan.price}
                            </p>

                            <p>
                                <strong>Duration:</strong> {plan.durationDays} Days
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {plan.active
                                    ? "Active"
                                    : "Disabled"}
                            </p>

                            <p>
                                <strong>Popular:</strong>{" "}
                                {plan.popular
                                    ? "Yes"
                                    : "No"}
                            </p>

                            <div
                                style={{
                                    marginTop: "20px"
                                }}
                            >

                                <h3>
                                    Features
                                </h3>

                                <div
                                    style={{
                                        display: "grid",
                                        gap: "8px",
                                        marginTop: "10px"
                                    }}
                                >

                                    {Object.keys(
                                        plan.features || {}
                                    ).map(feature => (

                                        <div
                                            key={feature}
                                            style={{
                                                background: "#1e293b",
                                                padding: "10px",
                                                borderRadius: "8px"
                                            }}
                                        >
                                            ✅ {feature}
                                        </div>

                                    ))}

                                </div>

                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: "10px",
                                    marginTop: "25px",
                                    flexWrap: "wrap"
                                }}
                            >

                                <button
                                    onClick={() =>
                                        handleEdit(plan)
                                    }
                                    style={editBtn}
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() =>
                                        handleDelete(plan.id)
                                    }
                                    style={deleteBtn}
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    ))}

            </div>

        </div>
    );
};

const inputStyle = {
    width: "95%",
    padding: "12px",
    marginTop: "12px",
    borderRadius: "10px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#fff"
};

const editBtn = {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer"
};

const deleteBtn = {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer"
};

export default PlanEditor;