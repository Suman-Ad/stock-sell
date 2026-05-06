import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { updateDoc, doc, getDoc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { db } from "../firebase";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ✅ correct
  const [verificationSent, setVerificationSent] = useState(false);
  const [loging, setLoging] = useState(false);

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email resent!");
    }
  };

  const handleLogin = async () => {
    try {
      // ✅ ADD THIS LINE FIRST
      await setPersistence(auth, browserLocalPersistence);

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

      setLoging(true);

      // ✅ Merge data
      const userData = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        ...dbData,
      };

      // ✅ Remove sensitive data
      const { govId, gstNo, ...safeData } = userData;

      localStorage.setItem("user", JSON.stringify(safeData));
      setUser(safeData);

      // ✅ Update login info
      await updateDoc(userRef, {
        emailVerified: true,
        lastLogin: new Date(),
      });

      setLoging(false);
      alert("Login Successful!");
      navigate("/dashboard");

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="login-container" >
      <div className="login-box" >

        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          disabled={loging}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          disabled={loging}
        />
        <br /><br />

        <button onClick={handleLogin}>{loging ? "Loging..." : "Login"}</button>

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
    </div>
  );
};

export default Login;