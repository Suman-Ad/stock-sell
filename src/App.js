import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { Navigate } from "react-router-dom";

// Importing pages and components
import Login from './pages/Login';
import Signup from './pages/Signup';
import StockInventory from './pages/StockInventory';
import Layout from './pages/Layout';
import StockList from './pages/StockList';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import SellProduct from './pages/SellProduct';
import Dashboard from './pages/Dashboard';
import SalesHistory from './pages/SalesHistory';
import Profile from './pages/Profile'
import ProtectedRoute from './hooks/ProtectedRoute';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));

          if (snap.exists()) {
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...snap.data(),
            };

            setUser(userData);
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error(err);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (!stored || !stored.uid) return;

    try {
      const snap = await getDoc(doc(db, "users", stored.uid));

      if (snap.exists()) {
        const updatedUser = { ...stored, ...snap.data() };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      console.error(err);
    }
  };


  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>

        {/* Public Routes */}
        <Route
          path="/login"
          element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />}
        />
        <Route path="/signup" element={<Signup />} />

        {/* Default Route */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          }
        />

        <Route element={<Layout user={user} />}>

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-inventory"
            element={
              <ProtectedRoute user={user}>
                <StockInventory user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/stock-list"
            element={
              <ProtectedRoute user={user}>
                <StockList user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sell-product"
            element={
              <ProtectedRoute user={user}>
                <SellProduct user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales-history"
            element={
              <ProtectedRoute user={user}>
                <SalesHistory user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user}>
                <Profile user={user} />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user}>
                <AdminRoute>
                  <AdminDashboard user={user} />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;