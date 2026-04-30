import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleSignup = async () => {
        try {
            // 1️⃣ Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            // 2️⃣ Store user data in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name,
                email,
                shopName: "My Store",
                role: "owner",
                createdAt: new Date()
            });

            alert("User Registered Successfully!");

            // 3️⃣ Redirect to dashboard or login
            navigate("/dashboard");

        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>Signup</h2>

            <input
                type="text"
                placeholder="Full Name"
                onChange={(e) => setName(e.target.value)}
            />
            <br /><br />

            <input
                type="email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
            />
            <br /><br />

            <input
                type="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
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