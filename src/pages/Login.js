import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { updateDoc, doc, getDoc } from "firebase/firestore";
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
        email.toLowerCase(),
        password
      );

      const user = userCredential.user;

      // ❌ Email not verified
      if (!user.emailVerified) {
        setVerificationSent(true);
        alert("Please verify your email before login.");
        return;
      }

      // ✅ Fetch Firestore user
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User data not found!");
        return;
      }

      const dbData = userSnap.data();

      // ❌ Check admin approval
      if (!dbData.isActive) {
        alert("Your account is not approved yet.");
        return;
      }

      // ❌ Check subscription
      const now = new Date();
      const endDate = dbData.subscription?.endDate?.toDate();

      if (endDate && endDate < now) {
        alert("Subscription expired.");
        return;
      }

      // ✅ Merge data
      const userData = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        ...dbData,
      };

      // ✅ Remove sensitive data
      const { govId, ...safeData } = userData;

      localStorage.setItem("user", JSON.stringify(safeData));

      // ✅ Update login info
      await updateDoc(userRef, {
        emailVerified: true,
        lastLogin: new Date(),
      });

      alert("Login Successful!");
      navigate("/stock-inventory");

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