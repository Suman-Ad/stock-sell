import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const initUser = async () => {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        await refreshUser();
      }

      setLoading(false);
    };

    initUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected / App Routes */}
        <Route element={<Layout user={user} />}>
          <Route path="/stock-inventory" element={<StockInventory user={user} />} />
          <Route path="/stock-list" element={<StockList user={user} />} />
          <Route path="/sell-product" element={<SellProduct user={user} />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/sales-history" element={<SalesHistory user={user} />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard user={user} /></AdminRoute>} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;