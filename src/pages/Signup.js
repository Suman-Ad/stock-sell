import React, { useState } from "react";
import { auth, db } from "../firebase";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";


const Signup = () => {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        shopName: "",
        address: "",
        pin: "",
        govId: ""
    });

    const navigate = useNavigate();

    // handle input change
    const handleChange = (field, value) => {
        setForm({ ...form, [field]: value });
    };

    // validation
    const validate = () => {
        if (!form.name || !form.email || !form.password) {
            alert("Name, Email & Password required");
            return false;
        }

        if (!form.shopName) {
            alert("Shop Name required");
            return false;
        }

        if (!form.address || !form.pin) {
            alert("Complete Address with PIN required");
            return false;
        }

        if (!/^\d{6}$/.test(form.pin)) {
            alert("PIN must be 6 digits");
            return false;
        }

        if (!form.govId) {
            alert("Government ID required");
            return false;
        }

        if (form.password.length < 6) {
            alert("Password must be at least 6 characters");
            return false;
        }

        return true;
    };

    const handleSignup = async () => {
        try {
            if (!validate()) return;

            // 1️⃣ Create Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                form.email,
                form.password
            );

            const user = userCredential.user;

            // 2️⃣ Send email verification
            await sendEmailVerification(user);

            // 3️⃣ Setup subscription
            const now = new Date();
            const end = new Date();
            end.setMonth(end.getMonth() + 1);

            // 4️⃣ Save user in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: form.name,
                email: form.email,
                shopName: form.shopName,
                address: form.address,
                pin: form.pin,
                govId: form.govId,

                role: "user",
                isActive: false,

                emailVerified: false, // 👈 important

                subscription: {
                    plan: "free",
                    startDate: now,
                    endDate: end,
                    status: "active"
                },

                createdAt: serverTimestamp()
            });

            alert("Verification email sent! Please verify before login.");

            navigate("/login");

        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "30px" }}>
            <h2>Signup</h2>

            <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
            />
            <br /><br />

            <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
            />
            <br /><br />

            <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
            />
            <br /><br />

            <input
                type="text"
                placeholder="Shop Name"
                value={form.shopName}
                onChange={(e) => handleChange("shopName", e.target.value)}
            />
            <br /><br />

            <textarea
                placeholder="Address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
            />
            <br /><br />

            <input
                type="text"
                placeholder="PIN Code"
                value={form.pin}
                onChange={(e) => handleChange("pin", e.target.value)}
            />
            <br /><br />

            <input
                type="text"
                placeholder="Government ID Number"
                value={form.govId}
                onChange={(e) => handleChange("govId", e.target.value)}
            />
            <br /><br />

            <button onClick={handleSignup}>Register</button>

            <br /><br />

            <p>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};

export default Signup;