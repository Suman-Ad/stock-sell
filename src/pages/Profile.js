import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword } from "firebase/auth";
import "../assets/Profile.css";
import FeatureGate from "../components/FeatureGate";


const Profile = ({}) => {
    const [userData, setUserData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [uploading, setUploading] = useState(false);

    const user = auth.currentUser;

    const subscription = userData?.subscription || {};
    const isExpired =
        subscription.status === "expired";

    // 🔴 REAL-TIME DATA (auto refresh)
    useEffect(() => {
        if (!user) return;

        const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            }
        });

        return () => unsub();
    }, [user]);

    // 🔹 Handle input change
    const handleChange = (field, value) => {
        setUserData({ ...userData, [field]: value });
    };

    // 🔹 Update profile
    const handleUpdate = async () => {
        try {
            await updateDoc(doc(db, "users", user.uid), {
                name: userData.name,
                mobile: userData.mobile,
                shopName: userData.shopName,
                address: userData.address,
                pin: userData.pin,
                govId: userData.govId,
                gstNo: userData.gstNo
            });

            alert("Profile updated!");
            setEditing(false);
        } catch (err) {
            alert(err.message);
        }
    };

    // 🔹 Upload Profile Image
    const handleImageUpload = async (file) => {

        try {

            if (!file) return;

            // =====================
            // VALIDATION
            // =====================

            if (
                !file.type.startsWith("image/")
            ) {

                alert("Only image allowed");

                return;
            }

            if (
                file.size >
                5 * 1024 * 1024
            ) {

                alert("Image must be under 5MB");

                return;
            }

            setUploading(true);

            const storageRef = ref(
                storage,
                `profileImages/${user.uid}`
            );

            await uploadBytes(
                storageRef,
                file
            );

            const downloadURL =
                await getDownloadURL(
                    storageRef
                );

            await updateDoc(
                doc(db, "users", user.uid),
                {
                    photoURL: downloadURL
                }
            );

            alert("Profile image updated!");

        } catch (err) {

            console.log(err);

            alert(err.message);

        } finally {

            setUploading(false);

        }
    };

    // 🔹 Change password
    const handlePasswordChange = async () => {

        try {

            if (
                newPassword.length < 6
            ) {

                alert(
                    "Min 6 characters required"
                );

                return;
            }

            await updatePassword(
                user,
                newPassword
            );

            alert("Password updated!");

            setNewPassword("");

        } catch (err) {

            console.log(err);

            // Firebase secure login error
            if (
                err.code ===
                "auth/requires-recent-login"
            ) {

                alert(
                    "Please logout and login again before changing password."
                );

                return;
            }

            alert(err.message);

        }
    };

    if (!userData) return <p>Loading...</p>;

    return (
        <div className="profile-container">
            <div className="profile-box">
                <h2>My Profile</h2>

                {/* 🖼 Profile Image */}
                <img
                    src={userData.photoURL || "https://via.placeholder.com/120"}
                    alt="profile"
                    style={{ width: 120, height: 120, borderRadius: "50%" }}
                />

                <br /><br />

                <FeatureGate
                    user={userData}
                    feature="imageUpload"
                    title="Image Upload"
                    description="Upgrade your plan to unlock Image Uplad."
                >
                    <input
                        type="file"
                        onChange={(e) => handleImageUpload(e.target.files[0])}
                    />
                    {uploading && <p>Uploading...</p>}
                </FeatureGate>



                <br /><br />

                <input
                    value={userData.name || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
                <br /><br />

                <input value={userData.email} disabled />
                <br /><br />

                <input
                    value={userData.mobile || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                />
                <br /><br />

                <input
                    value={userData.shopName || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("shopName", e.target.value)}
                />
                <br /><br />

                <textarea
                    value={userData.address || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("address", e.target.value)}
                />
                <br /><br />

                <input
                    value={userData.pin || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("pin", e.target.value)}
                />
                <br /><br />

                <input
                    value={userData.govId || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("govId", e.target.value)}
                />
                <br /><br />

                <input
                    value={userData.gstNo || ""}
                    disabled={!editing}
                    onChange={(e) => handleChange("gstNo", e.target.value)}
                />

                <br /><br />

                {/* ✅ Subscription */}
                {/* =========================
   SUBSCRIPTION SECTION
========================= */}

                <div className="subscription-card">

                    <div className="subscription-header">

                        <div>

                            <h3>
                                Subscription Plan
                            </h3>

                            <p>
                                Manage your active subscription
                            </p>

                        </div>

                        <div
                            className={
                                subscription.status === "active"
                                    ? "plan-badge active"
                                    : "plan-badge expired"
                            }
                        >

                            {
                                subscription.status || "inactive"
                            }

                        </div>

                    </div>

                    {/* PLAN */}

                    <div className="subscription-plan">

                        <h2 style={{
                            color: isExpired
                                ? "#ef4444"
                                : "#22c55e"
                        }}>

                            {
                                subscription.planName ||
                                subscription.planId ||
                                "Free"
                            }

                        </h2>

                    </div>

                    {/* DATES */}

                    <div className="subscription-grid">

                        <div className="subscription-item">

                            <span>
                                Start Date
                            </span>

                            <strong>

                                {
                                    subscription.startDate
                                        ?.toDate?.()
                                        ?.toLocaleDateString?.() || "N/A"
                                }

                            </strong>

                        </div>

                        <div className="subscription-item">

                            <span>
                                Expiry Date
                            </span>

                            <strong>

                                {
                                    subscription.endDate
                                        ?.toDate?.()
                                        ?.toLocaleDateString?.() || "N/A"
                                }

                            </strong>

                        </div>

                    </div>

                    {/* FEATURES */}

                    <div
                        style={{
                            marginTop: "20px"
                        }}
                    >

                        <h4
                            style={{
                                color: "#fff",
                                marginBottom: "15px"
                            }}
                        >

                            Plan Features

                        </h4>

                        <div className="feature-list">

                            {
                                subscription.features &&
                                    Object.keys(subscription.features)
                                        .length > 0 ? (

                                    Object.entries(
                                        subscription.features
                                    ).map(([key, value]) => {

                                        if (!value) return null;

                                        return (

                                            <div key={key}>

                                                ✅ {
                                                    key
                                                        .replace(
                                                            /([A-Z])/g,
                                                            " $1"
                                                        )
                                                        .replace(/^./, str =>
                                                            str.toUpperCase()
                                                        )
                                                }

                                            </div>
                                        );
                                    })

                                ) : (

                                    <div>
                                        No features available
                                    </div>

                                )
                            }

                        </div>

                    </div>

                    {/* ACTION */}

                    <button
                        className="subscription-btn"
                        onClick={() =>
                            window.location.assign("/plans")
                        }
                    >

                        Upgrade Plan

                    </button>

                </div>

                <br />

                {!editing ? (
                    <button onClick={() => setEditing(true)}>Edit</button>
                ) : (
                    <>
                        <button onClick={handleUpdate}>Save</button>
                        <button onClick={() => setEditing(false)}>Cancel</button>
                    </>
                )}

                <br /><br />

                {/* 🔐 Password */}
                <h4>Change Password</h4>
                <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />
                <br /><br />
                <button onClick={handlePasswordChange}>Update Password</button>
            </div>
        </div>
    );
};

export default Profile;