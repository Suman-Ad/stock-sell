import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setAllowed(false);
                setLoading(false);
                return;
            }

            try {
                const snap = await getDoc(doc(db, "users", user.uid));

                if (snap.exists()) {
                    const data = snap.data();

                    if ((data.role === "admin" || data.role === "superadmin") && data.isActive) {
                        setAllowed(true);
                    } else {
                        setAllowed(false);
                    }
                } else {
                    setAllowed(false);
                }
            } catch (error) {
                console.error("Admin check error:", error);
                setAllowed(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ⏳ Loading state
    if (loading) return <p>Checking access...</p>;

    // ❌ Not allowed → redirect
    if (!allowed) return <Navigate to="/login" replace />;

    // ✅ Allowed
    return children;
};

export default AdminRoute;