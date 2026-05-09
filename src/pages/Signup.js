import React, { useState } from "react";
import { auth, db } from "../firebase";

import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "firebase/auth";

import {
    setDoc,
    doc,
    serverTimestamp,
    getDoc
} from "firebase/firestore";

import {
    useNavigate,
    Link
} from "react-router-dom";

import "../assets/Signup.css";

const Signup = () => {

    const [form, setForm] = useState({

        name: "",

        email: "",

        mobile: "",

        password: "",

        confirmPassword: "",

        shopName: "",

        address: "",

        pin: "",

        govId: "",

        gstNo: ""

    });

    const [registering, setRegistering] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();

    // ==============================
    // Handle Change
    // ==============================

    const handleChange = (field, value) => {

        setForm(prev => ({
            ...prev,
            [field]: value
        }));

    };

    // ==============================
    // Validation
    // ==============================

    const validate = () => {

        // Required
        if (
            !form.name ||
            !form.email ||
            !form.mobile ||
            !form.password ||
            !form.shopName
        ) {

            alert("Please fill all required fields");

            return false;
        }

        // Name
        if (form.name.length < 3) {

            alert("Name too short");

            return false;
        }

        // Email
        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(form.email)) {

            alert("Invalid email");

            return false;
        }

        // Mobile
        if (!/^[6-9]\d{9}$/.test(form.mobile)) {

            alert("Invalid mobile number");

            return false;
        }

        // Password
        if (form.password.length < 6) {

            alert(
                "Password must be minimum 6 characters"
            );

            return false;
        }

        // Confirm Password
        if (
            form.password !==
            form.confirmPassword
        ) {

            alert("Passwords do not match");

            return false;
        }

        // PIN
        if (
            form.pin &&
            !/^\d{6}$/.test(form.pin)
        ) {

            alert("PIN must be 6 digits");

            return false;
        }

        return true;
    };

    // ==============================
    // Signup
    // ==============================

    const handleSignup = async () => {

        try {

            if (!validate()) return;

            setRegistering(true);

            // ==========================
            // CHECK FREE PLAN
            // ==========================

            const planRef = doc(
                db,
                "plans",
                "free"
            );

            const planSnap = await getDoc(planRef);

            if (!planSnap.exists()) {

                alert(
                    "Default subscription plan not found"
                );

                setRegistering(false);

                return;
            }

            const freePlan = planSnap.data();

            // ==========================
            // CREATE AUTH USER
            // ==========================

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    form.email.toLowerCase(),
                    form.password
                );

            const user = userCredential.user;

            // ==========================
            // EMAIL VERIFICATION
            // ==========================

            await sendEmailVerification(user);

            // ==========================
            // SUBSCRIPTION
            // ==========================

            const startDate = new Date();

            const endDate = new Date();

            endDate.setDate(
                endDate.getDate() +
                freePlan.durationDays
            );

            // ==========================
            // SAVE USER
            // ==========================

            await setDoc(
                doc(db, "users", user.uid),
                {

                    uid: user.uid,

                    name: form.name.trim(),

                    email: form.email
                        .trim()
                        .toLowerCase(),

                    mobile: form.mobile,

                    shopName: form.shopName.trim(),

                    address: form.address.trim(),

                    pin: form.pin,

                    govId: form.govId.trim(),

                    gstNo: form.gstNo.trim(),

                    photoURL: "",

                    role: "user",

                    isActive: false,

                    emailVerified: false,

                    profileCompleted: true,

                    // ======================
                    // SUBSCRIPTION
                    // ======================

                    subscription: {

                        ...freePlan,

                        status: "active",

                        paymentStatus: "free",

                        autoRenew: false,

                        startDate,

                        endDate,

                        upgradedFrom: null

                    },

                    // ======================
                    // ACCOUNT STATUS
                    // ======================

                    accountStatus: "pending",

                    lastLogin: null,

                    createdAt: serverTimestamp(),

                    updatedAt: serverTimestamp()

                }
            );

            alert(
                "Verification email sent successfully!"
            );

            navigate("/login");

        } catch (err) {

            console.log(err);

            if (
                err.code ===
                "auth/email-already-in-use"
            ) {

                alert(
                    "Email already registered"
                );

            } else if (
                err.code ===
                "auth/weak-password"
            ) {

                alert(
                    "Weak password"
                );

            } else {

                alert(err.message);

            }

        } finally {

            setRegistering(false);

        }
    };

    return (

        <div className="auth-container">

            <div className="auth-box">

                <h2>Create Account</h2>

                <p className="auth-subtitle">
                    Start managing your stock smarter
                </p>

                {/* NAME */}

                <input
                    type="text"
                    placeholder="Full Name *"
                    value={form.name}
                    onChange={(e) =>
                        handleChange(
                            "name",
                            e.target.value
                        )
                    }
                />

                {/* EMAIL */}

                <input
                    type="email"
                    placeholder="Email Address *"
                    value={form.email}
                    onChange={(e) =>
                        handleChange(
                            "email",
                            e.target.value
                        )
                    }
                />

                {/* MOBILE */}

                <input
                    type="tel"
                    placeholder="Mobile Number *"
                    value={form.mobile}
                    onChange={(e) =>
                        handleChange(
                            "mobile",
                            e.target.value
                        )
                    }
                />

                {/* PASSWORD */}

                <input
                    type={
                        showPassword
                            ? "text"
                            : "password"
                    }
                    placeholder="Password *"
                    value={form.password}
                    onChange={(e) =>
                        handleChange(
                            "password",
                            e.target.value
                        )
                    }
                />

                {/* CONFIRM PASSWORD */}

                <input
                    type={
                        showPassword
                            ? "text"
                            : "password"
                    }
                    placeholder="Confirm Password *"
                    value={form.confirmPassword}
                    onChange={(e) =>
                        handleChange(
                            "confirmPassword",
                            e.target.value
                        )
                    }
                />

                {/* SHOW PASSWORD */}

                <label className="checkbox-row">

                    <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={() =>
                            setShowPassword(
                                !showPassword
                            )
                        }
                    />

                    Show Password

                </label>

                {/* SHOP */}

                <input
                    type="text"
                    placeholder="Shop Name *"
                    value={form.shopName}
                    onChange={(e) =>
                        handleChange(
                            "shopName",
                            e.target.value
                        )
                    }
                />

                {/* ADDRESS */}

                <textarea
                    placeholder="Full Address"
                    value={form.address}
                    onChange={(e) =>
                        handleChange(
                            "address",
                            e.target.value
                        )
                    }
                />

                {/* PIN */}

                <input
                    type="text"
                    placeholder="PIN Code"
                    value={form.pin}
                    onChange={(e) =>
                        handleChange(
                            "pin",
                            e.target.value
                        )
                    }
                />

                {/* GOV ID */}

                <input
                    type="text"
                    placeholder="Government ID"
                    value={form.govId}
                    onChange={(e) =>
                        handleChange(
                            "govId",
                            e.target.value
                        )
                    }
                />

                {/* GST */}

                <input
                    type="text"
                    placeholder="GST Number (Optional)"
                    value={form.gstNo}
                    onChange={(e) =>
                        handleChange(
                            "gstNo",
                            e.target.value
                        )
                    }
                />

                {/* BUTTON */}

                <button
                    className="auth-btn"
                    onClick={handleSignup}
                    disabled={registering}
                >

                    {
                        registering
                            ? "Creating Account..."
                            : "Create Account"
                    }

                </button>

                <p className="auth-footer">

                    Already have an account?{" "}

                    <Link to="/login">

                        Login

                    </Link>

                </p>

            </div>

        </div>

    );
};

export default Signup;