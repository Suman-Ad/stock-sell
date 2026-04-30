import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from './pages/Login';
import Signup from './pages/Signup';
import StockInventory from './pages/StockInventory';
import Layout from './pages/Layout';
import StockList from './pages/StockList';

function App() {
  return (
    <Router>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected / App Routes */}
        <Route element={<Layout />}>
          <Route path="/stock-inventory" element={<StockInventory />} />
          <Route path="/stock-list" element={<StockList />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;