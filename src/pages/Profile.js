import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword } from "firebase/auth";
import "../assets/Profile.css";

const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [uploading, setUploading] = useState(false);

    const user = auth.currentUser;

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

            setUploading(true);

            const storageRef = ref(storage, `profileImages/${user.uid}`);
            await uploadBytes(storageRef, file);

            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, "users", user.uid), {
                photoURL: downloadURL
            });

            alert("Profile image updated!");
            setUploading(false);
        } catch (err) {
            alert(err.message);
            setUploading(false);
        }
    };

    // 🔹 Change password
    const handlePasswordChange = async () => {
        try {
            if (newPassword.length < 6) {
                alert("Min 6 characters required");
                return;
            }

            await updatePassword(user, newPassword);
            alert("Password updated!");
            setNewPassword("");
        } catch (err) {
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

                <input
                    type="file"
                    onChange={(e) => handleImageUpload(e.target.files[0])}
                />
                {uploading && <p>Uploading...</p>}

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
                                userData.subscription?.status === "active"
                                    ? "plan-badge active"
                                    : "plan-badge expired"
                            }
                        >

                            {
                                userData.subscription?.status || "inactive"
                            }

                        </div>

                    </div>

                    {/* PLAN */}

                    <div className="subscription-plan">

                        <h2>

                            {
                                userData.subscription?.planId?.toUpperCase() || "FREE"
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
                                    userData.subscription?.startDate
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
                                    userData.subscription?.endDate
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

                            <div>
                                ✅ Stock Management
                            </div>

                            <div>
                                ✅ QR Code System
                            </div>

                            <div>
                                ✅ Sales Tracking
                            </div>

                            {
                                userData.subscription?.planId !== "free" && (

                                    <>
                                        <div>
                                            ✅ Excel Export
                                        </div>

                                        <div>
                                            ✅ Bulk QR Print
                                        </div>

                                        <div>
                                            ✅ Advanced Reports
                                        </div>
                                    </>
                                )
                            }

                        </div>

                    </div>

                    {/* ACTION */}

                    <button
                        className="subscription-btn"
                        onClick={() =>
                            window.location.href = "/plans"
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