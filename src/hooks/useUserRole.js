// useUserRole.js
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const useUserRole = () => {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const fetchRole = async () => {
            if (!auth.currentUser) return;

            const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (!snap.exists()) {
                setRole("user"); // fallback
                return;
            }
            setRole(snap.data()?.role || "user");
        };

        fetchRole();
    }, []);

    return role;
};

export default useUserRole;