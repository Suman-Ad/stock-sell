import React, {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    auth,
    db
} from "../firebase";

import {
    onAuthStateChanged
} from "firebase/auth";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "firebase/firestore";

// ==============================
// CONTEXT
// ==============================

const AuthContext =
    createContext();

// ==============================
// PROVIDER
// ==============================

export const AuthProvider = ({
    children
}) => {

    const [user, setUser] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    // ==========================
    // AUTH LISTENER
    // ==========================

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (firebaseUser) => {

                    try {

                        // No login
                        if (!firebaseUser) {

                            setUser(null);

                            localStorage.removeItem(
                                "user"
                            );

                            setLoading(false);

                            return;
                        }

                        // ======================
                        // GET FIRESTORE USER
                        // ======================

                        const userRef = doc(
                            db,
                            "users",
                            firebaseUser.uid
                        );

                        const userSnap =
                            await getDoc(
                                userRef
                            );

                        if (
                            !userSnap.exists()
                        ) {

                            setLoading(false);

                            return;
                        }

                        const dbData =
                            userSnap.data();

                        // ======================
                        // AUTO VERIFY SYNC
                        // ======================

                        if (
                            firebaseUser.emailVerified &&
                            !dbData.emailVerified
                        ) {

                            await updateDoc(
                                userRef,
                                {
                                    emailVerified: true,

                                    updatedAt:
                                        serverTimestamp()
                                }
                            );

                            dbData.emailVerified =
                                true;
                        }

                        // ======================
                        // FINAL USER DATA
                        // ======================

                        const safeUser = {

                            uid:
                                firebaseUser.uid,

                            email:
                                firebaseUser.email,

                            ...dbData

                        };

                        delete safeUser.govId;

                        // Save local
                        localStorage.setItem(
                            "user",
                            JSON.stringify(
                                safeUser
                            )
                        );

                        setUser(safeUser);

                    } catch (err) {

                        console.log(err);

                    } finally {

                        setLoading(false);

                    }
                }
            );

        return () =>
            unsubscribe();

    }, []);

    return (

        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading
            }}
        >

            {children}

        </AuthContext.Provider>

    );
};

// ==============================
// HOOK
// ==============================

export const useAuth = () =>
    useContext(AuthContext);