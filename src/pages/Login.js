import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { updateDoc, doc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { db } from "../firebase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ✅ correct
  const [verificationSent, setVerificationSent] = useState(false);

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email resent!");
    }
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 🔴 Block if not verified
      if (!user.emailVerified) {
        alert("Please verify your email before login.");
        return;
      }

      setVerificationSent(true); // Reset state on successful login

      alert("Login Successful!");
      if (user.emailVerified) {
        await updateDoc(doc(db, "users", user.uid), {
          emailVerified: true
        });
      }
      setVerificationSent(false); // Reset state after successful login
      navigate("/stock-inventory"); // 👉 redirect after login
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Login</h2>

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

      <button onClick={handleLogin}>Login</button>

      {verificationSent && (
        <div style={{ marginTop: "20px" }}>
          <p>Your email is not verified. Please check your inbox.</p>
          <button onClick={resendVerification}>Resend Verification Email</button>
        </div>
      )}

      <br /><br />

      {/* ✅ Better way using Link */}
      <p>
        Don't have an account? <Link to="/signup">Register</Link>
      </p>
    </div>
  );
};

export default Login;