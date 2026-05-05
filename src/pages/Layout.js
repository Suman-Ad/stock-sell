import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../assets/Layout.css";

const Layout = ({ user }) => {
    const [userName, setUserName] = useState("");
    const [shopName, setShopName] = useState("");
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem("user");
            navigate("/login");
        } catch (err) {
            alert(err.message);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Assuming user data stored in "users" collection
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserName(data.name || "User");
                        setShopName(data.shopName || "My Shop");
                    } else {
                        setUserName(user.email);
                        setShopName("My Shop");
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                setUserName("");
                setShopName("");
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="layout">

            {/* 🔷 HEADER */}
            <header className="layout-header">
                <h3 className="logo" onClick={() => navigate("/dashboard")}>
                    {shopName}
                </h3>

                <div className="header-right">
                    <span
                        className="profile-link"
                        onClick={() => navigate("/profile")}
                    >
                        👤 {userName}
                    </span>

                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            {/* 🔷 MAIN */}
            <main className="layout-main">
                <Outlet />
            </main>

            {/* 🔷 FOOTER */}
            <footer className="layout-footer">
                © {new Date().getFullYear()} Inventory App | Developed by You 🚀
            </footer>

        </div>
    );
};

export default Layout;