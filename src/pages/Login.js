import React, { useState } from "react";

import {
  auth,
  db
} from "../firebase";

import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";

import {
  updateDoc,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  useNavigate,
  Link
} from "react-router-dom";

import {
  isSubscriptionActive
} from "../utils/subscription";

import "../assets/Signup.css";

const Login = ({ setUser }) => {

  const navigate = useNavigate();

  // ==============================
  // STATES
  // ==============================

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [verificationSent, setVerificationSent] =
    useState(false);

  // ==============================
  // RESEND VERIFICATION
  // ==============================

  const resendVerification = async () => {

    try {

      if (auth.currentUser) {

        await sendEmailVerification(
          auth.currentUser
        );

        alert(
          "Verification email resent successfully!"
        );

      }

    } catch (err) {

      alert(err.message);

    }

  };

  // ==============================
  // FORGOT PASSWORD
  // ==============================

  const handleForgotPassword = async () => {

    try {

      if (!email) {

        alert(
          "Please enter your email address first."
        );

        return;
      }

      await sendPasswordResetEmail(
        auth,
        email.trim().toLowerCase()
      );

      alert(
        "Password reset email sent successfully!"
      );

    } catch (err) {

      console.log(err);

      if (
        err.code === "auth/user-not-found"
      ) {

        alert(
          "No account found with this email."
        );

      } else if (
        err.code === "auth/invalid-email"
      ) {

        alert(
          "Invalid email address."
        );

      } else {

        alert(err.message);

      }

    }
  };

  // ==============================
  // LOGIN
  // ==============================

  const handleLogin = async () => {

    try {

      // Validation
      if (!email || !password) {

        alert(
          "Email & Password required"
        );

        return;
      }

      setLoading(true);

      // Keep login session
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      // Firebase Login
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          password
        );

      const user = userCredential.user;

      // ==========================
      // EMAIL VERIFY
      // ==========================

      if (!user.emailVerified) {

        setVerificationSent(true);

        await signOut(auth);

        alert(
          "Please verify your email before login."
        );

        setLoading(false);

        return;
      }

      // ==========================
      // GET USER DATA
      // ==========================

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnap = await getDoc(
        userRef
      );

      if (!userSnap.exists()) {

        await signOut(auth);

        alert(
          "User account data not found."
        );

        setLoading(false);

        return;
      }

      const dbData = userSnap.data();

      // ==========================
      // ADMIN APPROVAL
      // ==========================

      if (!dbData.isActive) {

        await signOut(auth);

        alert(
          "Your account is pending admin approval."
        );

        setLoading(false);

        return;
      }

      // ==========================
      // SUBSCRIPTION
      // ==========================

      if (
        !isSubscriptionActive(dbData)
      ) {

        // await signOut(auth);

        alert(
          "Your subscription is inactive or expired."
        );

        navigate("/subscription-expired");

        setLoading(false);

        return;
      }

      // ==========================
      // SAFE USER DATA
      // ==========================

      const safeData = {

        uid: user.uid,

        email: user.email,

        emailVerified:
          user.emailVerified,

        ...dbData

      };

      // Remove sensitive fields
      delete safeData.govId;

      // ==========================
      // LOCAL STORAGE
      // ==========================

      localStorage.setItem(
        "user",
        JSON.stringify(safeData)
      );

      setUser(safeData);

      // ==========================
      // UPDATE LOGIN
      // ==========================

      await updateDoc(userRef, {

        emailVerified: true,

        lastLogin:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      });

      alert(
        "Login successful!"
      );

      navigate("/dashboard");

    } catch (err) {

      console.log(err);

      if (
        err.code ===
        "auth/invalid-credential"
      ) {

        alert(
          "Invalid email or password"
        );

      } else if (
        err.code ===
        "auth/too-many-requests"
      ) {

        alert(
          "Too many attempts. Try again later."
        );

      } else {

        alert(err.message);

      }

    } finally {

      setLoading(false);

    }
  };

  return (

    <div className="auth-container">

      <div className="auth-box">

        <h2>Stock Sell</h2>

        <p className="auth-subtitle">
          Welcome Back, Login to continue managing your stock
        </p>

        {/* EMAIL */}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          disabled={loading}
        />

        {/* PASSWORD */}

        <input
          type={
            showPassword
              ? "text"
              : "password"
          }
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          disabled={loading}
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

        {/* FORGOT PASSWORD */}

        <div
          style={{
            width: "100%",
            textAlign: "right",
            marginTop: "-5px",
            marginBottom: "15px"
          }}
        >

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              color: "#60a5fa",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >

            Forgot Password?

          </button>

        </div>

        {/* LOGIN BUTTON */}

        <button
          className="auth-btn"
          onClick={handleLogin}
          disabled={loading}
        >

          {
            loading
              ? "Logging In..."
              : "Login"
          }

        </button>

        {/* EMAIL VERIFY */}

        {
          verificationSent && (

            <div
              style={{
                marginTop: 20
              }}
            >

              <p
                style={{
                  color: "#cbd5e1",
                  fontSize: 14
                }}
              >

                Email not verified yet.

              </p>

              <button
                className="auth-btn"
                onClick={
                  resendVerification
                }
              >

                Resend Verification Email

              </button>

            </div>

          )
        }

        {/* FOOTER */}

        <p className="auth-footer">

          Don't have an account?{" "}

          <Link to="/signup">

            Register

          </Link>

        </p>

        <p className="auth-footer">

          {" "}

          <Link to="/contact-us">

            Contact Us

          </Link>

        </p>

      </div>
    </div>
  );
};

export default Login;