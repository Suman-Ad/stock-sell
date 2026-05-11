// 🚀 ENTERPRISE ADMIN PANEL (Full Featured)
// Features: Search, Filter, Analytics, Pagination, Role Mgmt, User Detail Panel, Actions

import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  deleteDoc,
  getDocs,
  where,
  Timestamp
} from "firebase/firestore";
import SubscriptionManager from "./SubscriptionManager";
import PlanEditor from "./PlanEditor";
import "../assets/AdminDashboard.css";

const rolesColor = {
  user: "#6b7280",
  admin: "#2563eb",
  superadmin: "#7c3aed"
};

const ITEMS_PER_PAGE = 6;

const AdminDashboard = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [page, setPage] = useState(1);
  const [showPlan, setShowPlan] = useState(false);
  const [editPlans, setEditPlans] = useState(false);
  const [subscriptionRequests, setSubscriptionRequests] = useState({});
  const [contactMessages, setContactMessages] = useState([]);

  // 🔥 Load Users
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "users")), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 🔐 Permission Check
  const canModify = (u) => {
    if (user.id === u.id) return false;
    if (u.role === "superadmin" && user.role !== "superadmin") return false;
    return true;
  };

  // 🔍 Search + Filter
  const filteredUsers = useMemo(() => {
    return users
      .filter(u =>
        (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase())
      )
      .filter(u => filterRole === "all" ? true : u.role === filterRole);
  }, [users, search, filterRole]);

  // 📁 Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // 📊 Analytics
  const analytics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const admins = users.filter(u => u.role === "admin").length;
    const revenue = users.reduce((sum, u) => sum + (u.subscription?.price || 0), 0);
    return { total, active, admins, revenue };
  }, [users]);

  // ⚙️ Actions
  const toggleStatus = async (u) => {
    if (!canModify(u)) return alert("Permission denied");
    await updateDoc(doc(db, "users", u.id), { isActive: !u.isActive });
  };

  const changeRole = async (u, role) => {
    if (!canModify(u)) return alert("Permission denied");
    await updateDoc(doc(db, "users", u.id), { role });
  };

  const deleteUser = async (u) => {
    if (!canModify(u)) return alert("Permission denied");
    if (!window.confirm("Delete user permanently?")) return;
    await deleteDoc(doc(db, "users", u.id));
    setSelectedUser(null);
  };

  // ✅ APPROVE SUBSCRIPTION
  // const approveRequest = async (req) => {

  //   try {

  //     const startDate = new Date();

  //     const endDate = new Date();

  //     endDate.setDate(
  //       endDate.getDate() + (req.duration || 30)
  //     );

  //     // UPDATE USER SUBSCRIPTION
  //     await updateDoc(
  //       doc(db, "users", req.userId),
  //       {
  //         subscription: {
  //           planId: req.planId,
  //           planName: req.planName,
  //           price: req.price,
  //           features: req.features || {},
  //           durationDays: req.duration || 30,

  //           billingCycle: "monthly",
  //           currency: "INR",

  //           maxProducts: req.maxProducts || -1,
  //           maxUsers: req.maxUsers || -1,

  //           paymentMethod: req.paymentMethod || "UPI",
  //           paymentStatus: "paid",

  //           transactionId: req.transactionId || "",

  //           startDate,
  //           endDate,

  //           status: "active",
  //           autoRenew: false,

  //           updatedAt: Timestamp.now()
  //         }
  //       }
  //     );

  //     // UPDATE REQUEST STATUS
  //     await updateDoc(
  //       doc(db, "subscriptionRequests", req.id),
  //       {
  //         status: "approved",
  //         approvedAt: Timestamp.now()
  //       }
  //     );

  //     alert("Subscription Approved");

  //   } catch (err) {

  //     console.log(err);

  //     alert(err.message);

  //   }
  // };

  // // ❌ REJECT REQUEST
  // const rejectRequest = async (req) => {

  //   try {

  //     const confirmReject =
  //       window.confirm(
  //         "Reject this request?"
  //       );

  //     if (!confirmReject) return;

  //     await updateDoc(
  //       doc(db, "subscriptionRequests", req.id),
  //       {
  //         status: "rejected",
  //         rejectedAt: Timestamp.now()
  //       }
  //     );

  //     alert("Request Rejected");

  //   } catch (err) {

  //     console.log(err);

  //     alert(err.message);

  //   }
  // };

  // 🗑 DELETE REQUEST
  // const deleteRequest = async (reqId) => {

  //   try {

  //     const confirmDelete =
  //       window.confirm(
  //         "Delete this request?"
  //       );

  //     if (!confirmDelete) return;

  //     await deleteDoc(
  //       doc(db, "subscriptionRequests", reqId)
  //     );

  //   } catch (err) {

  //     console.log(err);

  //     alert(err.message);

  //   }
  // };

  // 🔔 REALTIME SUBSCRIPTION REQUESTS
  useEffect(() => {

    const unsub = onSnapshot(
      collection(db, "subscriptionRequests"),
      (snap) => {

        const grouped = {};

        snap.docs.forEach(d => {

          const data = {
            id: d.id,
            ...d.data()
          };

          if (!grouped[data.userId]) {
            grouped[data.userId] = [];
          }

          grouped[data.userId].push(data);

        });

        setSubscriptionRequests(grouped);

      }
    );

    return () => unsub();

  }, []);

  // 🔔 CONTACT MESSAGES
  useEffect(() => {

    const unsub = onSnapshot(
      collection(db, "contactMessages"),
      (snap) => {

        const data = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setContactMessages(data);

      }
    );

    return () => unsub();

  }, []);

  return (
    <div className="admin-dashboard-container">

      {/* =========================
        HEADER
    ========================== */}
      <div className="admin-topbar">

        <div>
          <h1 className="admin-page-title">
            Stock Sell Admin Panel
          </h1>

          <p className="admin-page-subtitle">
            Manage users, subscriptions, plans & platform analytics
          </p>
        </div>

        <div className="admin-top-actions">
          <button
            className="admin-btn"
            onClick={() => setShowPlan(!showPlan)}
          >
            {showPlan ? "Close Subscription Manager" : "Subscription Manager"}
          </button>

          <button
            className="admin-btn secondary"
            onClick={() => setEditPlans(!editPlans)}
          >
            {editPlans ? "Close Plan Manager" : "Manage Plans"}
          </button>
        </div>

      </div>

      {/* =========================
        ANALYTICS
    ========================== */}

      <div className="admin-analytics">

        <div className="admin-card">
          <h2>{analytics.total}</h2>
          <p>Total Users</p>
        </div>

        <div className="admin-card">
          <h2>{analytics.active}</h2>
          <p>Active Users</p>
        </div>

        <div className="admin-card">
          <h2>{analytics.admins}</h2>
          <p>Admins</p>
        </div>

        <div className="admin-card">
          <h2>₹{analytics.revenue}</h2>
          <p>Total Revenue</p>
        </div>

      </div>

      {/* =========================
        TOGGLED PANELS
    ========================== */}

      {showPlan && (
        <div className="modal-overlay">
          <div className="admin-module-wrapper">
            <div className="modal-box">

              {/* Header */}
              <div className="modal-header">
                <h3>Manage User Subscription</h3>
                <button className="close-btn" onClick={() => setShowPlan(false)}>❌</button>
              </div>

              {/* Content */}
              <div className="modal-content" >
                <SubscriptionManager />
              </div>

            </div>
          </div>
        </div>
      )}

      {editPlans && (

        <div className="modal-overlay">
          <div className="admin-module-wrapper">
            <div className="modal-box">

              {/* Header */}
              <div className="modal-header">
                <h3>Create/Edit Subscription Plans</h3>
                <button className="close-btn" onClick={() => setEditPlans(false)}>❌</button>
              </div>

              {/* Content */}
              <div className="modal-content" >
                <PlanEditor />
              </div>

            </div>
          </div>


        </div>
      )}

      {/* =========================
        SEARCH & FILTER
    ========================== */}

      <div className="admin-controls">

        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
          <option value="superadmin">Super Admins</option>
        </select>

      </div>

      {/* =========================
        MAIN CONTENT
    ========================== */}

      <div className="admin-layout">

        {/* =========================
          USERS GRID
      ========================== */}

        <div className="admin-grid">

          {paginatedUsers.length > 0 ? (

            paginatedUsers.map((u) => (

              <div
                key={u.id}
                className={`admin-user-card ${selectedUser?.id === u.id ? "active" : ""}`}
                onClick={() => setSelectedUser(u)}
              >

                <div className="admin-user-top">

                  <div className="admin-avatar">
                    {(u.name || "U").charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h4>{u.name || "Unnamed User"}</h4>

                    <p>{u.email}</p>
                  </div>

                </div>

                <div className="admin-user-meta">

                  <span
                    className="admin-badge"
                    style={{
                      background: rolesColor[u.role]
                    }}
                  >
                    {u.role}
                  </span>

                  <span
                    className={`status-pill ${u.isActive ? "active" : "inactive"
                      }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>

                </div>

                {/* SUBSCRIPTION ALERT */}

                {
                  subscriptionRequests[u.id]?.some(
                    r => r.status === "pending"
                  ) && (
                    <div className="subscription-alert">
                      🔔 Pending Subscription Request
                    </div>
                  )
                }

              </div>

            ))

          ) : (

            <div className="admin-empty-state">
              No users found
            </div>

          )}

        </div>

        {/* =========================
          DETAILS PANEL
      ========================== */}

        <div className="admin-details">

          {selectedUser ? (

            <>

              {/* USER HEADER */}

              <div className="admin-detail-header">

                <div className="admin-detail-avatar">
                  {(selectedUser.name || "U").charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>

              </div>

              {/* EDIT MODE */}

              {selectedUser.editMode ? (

                <>

                  <input
                    value={selectedUser.name}
                    placeholder="Full Name"
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        name: e.target.value
                      })
                    }
                  />

                  <input
                    value={selectedUser.shopName || ""}
                    placeholder="Shop Name"
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        shopName: e.target.value
                      })
                    }
                  />

                  <textarea
                    rows="4"
                    value={selectedUser.address || ""}
                    placeholder="Address"
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        address: e.target.value
                      })
                    }
                  />

                  <input
                    value={selectedUser.pin || ""}
                    placeholder="PIN Code"
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        pin: e.target.value
                      })
                    }
                  />

                  <div className="admin-actions">

                    <button
                      className="admin-btn"
                      onClick={async () => {

                        await updateDoc(
                          doc(db, "users", selectedUser.id),
                          {
                            name: selectedUser.name,
                            shopName: selectedUser.shopName,
                            address: selectedUser.address,
                            pin: selectedUser.pin
                          }
                        );

                        setSelectedUser({
                          ...selectedUser,
                          editMode: false
                        });

                      }}
                    >
                      Save Changes
                    </button>

                    <button
                      className="admin-btn secondary"
                      onClick={() =>
                        setSelectedUser({
                          ...selectedUser,
                          editMode: false
                        })
                      }
                    >
                      Cancel
                    </button>

                  </div>

                </>

              ) : (

                <>

                  {/* USER INFO */}

                  <div className="admin-info-box">

                    <div className="admin-info-row">
                      <span>Shop</span>
                      <strong>{selectedUser.shopName || "N/A"}</strong>
                    </div>

                    <div className="admin-info-row">
                      <span>Address</span>
                      <strong>{selectedUser.address || "N/A"}</strong>
                    </div>

                    <div className="admin-info-row">
                      <span>PIN</span>
                      <strong>{selectedUser.pin || "N/A"}</strong>
                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="admin-actions">

                    <button
                      className="admin-btn"
                      onClick={() =>
                        setSelectedUser({
                          ...selectedUser,
                          editMode: true
                        })
                      }
                    >
                      Edit User
                    </button>

                    <button
                      className="admin-btn secondary"
                      onClick={() => toggleStatus(selectedUser)}
                    >
                      Toggle Status
                    </button>

                    <button
                      className="admin-btn"
                      onClick={() => changeRole(selectedUser, "admin")}
                    >
                      Make Admin
                    </button>

                    <button
                      className="admin-btn secondary"
                      onClick={() => changeRole(selectedUser, "user")}
                    >
                      Make User
                    </button>

                    <button
                      className="admin-btn danger"
                      onClick={() => deleteUser(selectedUser)}
                    >
                      Delete User
                    </button>

                  </div>

                  {/* REQUESTS */}

                  <h4 className="admin-section-title">
                    Subscription Requests
                  </h4>

                  {
                    subscriptionRequests[selectedUser.id]?.length > 0 ? (

                      subscriptionRequests[selectedUser.id].map(req => (

                        <div
                          key={req.id}
                          className="admin-request-card"
                        >

                          <p>
                            <b>Plan:</b> {req.planName}
                          </p>

                          <p>
                            <b>Price:</b> ₹{req.price}
                          </p>

                          <p>
                            <b>Status:</b> {req.status}
                          </p>

                          <p>
                            <b>Approve Date:</b> {
                              req.approvedAt ? req.approvedAt.toDate().toLocaleString() : new Date(req.approvedAt).toLocaleString()
                            }
                          </p>

                          {
                            req.paymentImage && (

                              <a
                                href={req.paymentImage}
                                target="_blank"
                                rel="noreferrer"
                                className="admin-payment-link"
                              >
                                View Payment Screenshot
                              </a>

                            )
                          }

                        </div>

                      ))

                    ) : (

                      <p>No subscription requests</p>

                    )
                  }

                  {/* SUBSCRIPTION */}

                  <h4 className="admin-section-title">
                    Subscription Data
                  </h4>

                  <pre>
                    {JSON.stringify(
                      selectedUser.subscription,
                      null,
                      2
                    )}
                  </pre>

                </>

              )}

            </>

          ) : (

            <div className="admin-empty-details">

              <div className="admin-empty-icon">
                👤
              </div>

              <h3>Select a User</h3>

              <p>
                Choose a user from the left panel
                to manage account settings.
              </p>

            </div>

          )}

        </div>

      </div>

      {/* =========================
    CONTACT MESSAGES
========================== */}

      <div
        style={{
          marginTop: "40px"
        }}
      >

        <h2
          style={{
            marginBottom: "20px",
            color: "#fff"
          }}
        >
          Contact Messages
        </h2>

        <div
          style={{
            display: "grid",
            gap: "20px"
          }}
        >

          {
            contactMessages.length > 0 ? (

              contactMessages.map(msg => (

                <div
                  key={msg.id}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "14px",
                    padding: "20px",
                    color: "#fff"
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px"
                    }}
                  >

                    <div>

                      <h3>
                        {msg.name}
                      </h3>

                      <p>
                        {msg.email}
                      </p>

                    </div>

                    <div>

                      <span
                        style={{
                          background:
                            msg.status === "new"
                              ? "#dc2626"
                              : "#16a34a",
                          padding: "6px 12px",
                          borderRadius: "999px",
                          fontSize: "12px"
                        }}
                      >
                        {msg.status}
                      </span>

                    </div>

                  </div>

                  <div
                    style={{
                      marginTop: "15px"
                    }}
                  >

                    <p>
                      <strong>
                        Subject:
                      </strong>{" "}
                      {msg.subject}
                    </p>

                    <p
                      style={{
                        marginTop: "10px",
                        lineHeight: "1.7"
                      }}
                    >
                      {msg.message}
                    </p>

                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap"
                    }}
                  >

                    <button
                      className="admin-btn"
                      onClick={async () => {

                        await updateDoc(
                          doc(
                            db,
                            "contactMessages",
                            msg.id
                          ),
                          {
                            status: "read"
                          }
                        );

                      }}
                    >
                      Mark Read
                    </button>

                    <button
                      className="admin-btn danger"
                      onClick={async () => {

                        const confirmDelete =
                          window.confirm(
                            "Delete this message?"
                          );

                        if (!confirmDelete) return;

                        await deleteDoc(
                          doc(
                            db,
                            "contactMessages",
                            msg.id
                          )
                        );

                      }}
                    >
                      Delete
                    </button>

                  </div>

                </div>

              ))

            ) : (

              <div
                className="admin-empty-state"
              >
                No contact messages
              </div>

            )
          }

        </div>

      </div>

      {/* =========================
        PAGINATION
    ========================== */}

      <div className="admin-pagination">

        <button
          className="admin-btn secondary"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>

        <span>
          Page {page} of {totalPages || 1}
        </span>

        <button
          className="admin-btn secondary"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>

      </div>

    </div>
  );
};

export default AdminDashboard;
