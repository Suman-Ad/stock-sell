import "./App.css";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import {
  useAuth
} from "./context/AuthProvider";

// PAGES
import Login from "./pages/Login";

import Signup from "./pages/Signup";

import Dashboard from "./pages/Dashboard";

import StockInventory from "./pages/StockInventory";

import StockList from "./pages/StockList";

import SellProduct from "./pages/SellProduct";

import SalesHistory from "./pages/SalesHistory";

import Profile from "./pages/Profile";

import AdminDashboard from "./pages/AdminDashboard";

import SubscriptionManager from "./pages/SubscriptionManager";

// COMPONENTS
import Layout from "./pages/Layout";

import ProtectedRoute from "./hooks/ProtectedRoute";

import SubscriptionExpired from "./pages/SubscriptionExpired";

import PlansPage from "./pages/PlansPage";
import ContactUs from "./pages/ContactUs";
import MarketplaceIntegrations from "./pages/MarketplaceIntegrations";
import MarketplaceCSVImport from "./pages/MarketplaceCSVImport";

function App() {

  // ==========================
  // AUTH
  // ==========================

  const {
    user,
    loading,
    setUser
  } = useAuth();

  // ==========================
  // LOADING
  // ==========================

  if (loading) {

    return (

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#fff",
          fontSize: "20px"
        }}
      >

        Loading...

      </div>

    );
  }

  return (

    <Router>

      <Routes>

        {/* ======================
            PUBLIC ROUTES
        ====================== */}
        <Route
          path="/login"
          element={<Login setUser={setUser} />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/contact-us"
          element={<ContactUs />}
        />

        <Route
          path="/subscription-expired"
          element={<SubscriptionExpired />}
        />

        <Route
          path="/plans"
          element={
            // <ProtectedRoute
            //   user={user}
            // >
            <PlansPage user={user} />
            // </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={
            !user
              ? (
                <Login
                  setUser={setUser}
                />
              )
              : (
                <Navigate
                  to="/dashboard"
                />
              )
          }
        />

        <Route
          path="/signup"
          element={
            !user
              ? <Signup />
              : (
                <Navigate
                  to="/dashboard"
                />
              )
          }
        />

        {/* ======================
            DEFAULT
        ====================== */}

        <Route
          path="/"
          element={
            user
              ? (
                <Navigate
                  to="/dashboard"
                />
              )
              : (
                <Navigate
                  to="/login"
                />
              )
          }
        />

        {/* ======================
            PROTECTED LAYOUT
        ====================== */}

        <Route
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
            >

              <Layout user={user} />

            </ProtectedRoute>
          }
        >

          {/* DASHBOARD */}

          <Route
            path="/dashboard"
            element={
              <Dashboard
                user={user}
              />
            }
          />

          {/* STOCK INVENTORY */}

          <Route
            path="/stock-inventory"
            element={
              <StockInventory
                user={user}
              />
            }
          />

          {/* STOCK LIST */}

          <Route
            path="/stock-list"
            element={
              <StockList
                user={user}
              />
            }
          />

          {/* SELL PRODUCT */}

          <Route
            path="/sell-product"
            element={
              <SellProduct
                user={user}
              />
            }
          />

          {/* SALES HISTORY */}

          <Route
            path="/sales-history"
            element={
              <SalesHistory
                user={user}
              />
            }
          />

          {/* PROFILE */}

          <Route
            path="/profile"
            element={
              <Profile
                user={user}
              />
            }
          />

          <Route
            path="/marketplace-integrations"
            element={
              <MarketplaceIntegrations user={user} />
            }
          />

          <Route
            path="/marketplace-csv-import"
            element={
              <MarketplaceCSVImport user={user} />
            }
          />

          {/* ======================
              ADMIN ROUTES
          ====================== */}

          <Route
            path="/admin"
            element={

              <ProtectedRoute
                user={user}
                requiredRole="superadmin"
              >

                <AdminDashboard
                  user={user}
                />

              </ProtectedRoute>

            }
          />

          {/* ======================
              SUBSCRIPTION
          ====================== */}

          <Route
            path="/subscription-manager"
            element={

              <ProtectedRoute
                user={user}
                requiredRole="superadmin"
              >

                <SubscriptionManager
                  user={user}
                />

              </ProtectedRoute>

            }
          />



        </Route>

      </Routes>

    </Router>
  );
}

export default App;