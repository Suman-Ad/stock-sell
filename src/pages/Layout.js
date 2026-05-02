import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Layout = () => {
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
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>

            {/* 🔷 HEADER */}
            <header style={{
                background: "#111",
                color: "#fff",
                padding: "10px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top:0,
            }}>
                <h3 onClick={() => navigate("/stock-inventory")}
                    style={{ cursor:"pointer" }}>{shopName}</h3>

                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <p onClick={() => navigate("/sell-product")}
                        style={{ cursor:"pointer"}}>Sell Product</p>
                    <p onClick={() => navigate("/dashboard")}
                        style={{ cursor:"pointer"}}>Dashboard</p>
                    <p onClick={() => navigate("/sales-history")}
                        style={{ cursor:"pointer"}}>Sales History</p>
                    <p onClick={() => navigate("/admin")}
                        style={{ cursor:"pointer"}}>Admin</p>
                    <span>👤 {userName}</span>

                    <button
                        onClick={handleLogout}
                        style={{
                            background: "#ff4d4d",
                            border: "none",
                            padding: "6px 12px",
                            color: "#fff",
                            cursor: "pointer",
                            borderRadius: "5px"
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>
            {/* 🔷 MAIN CONTENT */}
            <main style={{ flex: 1, padding: "20px" }}>
                <Outlet />
            </main>

            {/* 🔷 FOOTER */}
            <footer style={{
                background: "#222",
                color: "#aaa",
                textAlign: "center",
                padding: "10px",
                // position: "sticky",
                // bottom:0,
            }}>
                © {new Date().getFullYear()} Inventory App | Developed by You 🚀
            </footer>

        </div>
    );
};

export default Layout;