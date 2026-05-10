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


  return (
    <div className="container">

      {/* 📊 ANALYTICS */}
      <div className="analytics">
        <div className="card">👥 {analytics.total} Users</div>
        <div className="card">🟢 {analytics.active} Active</div>
        <div className="card">🧑‍💼 {analytics.admins} Admins</div>
        <div className="card">💰 ₹{analytics.revenue}</div>
      </div>

      <div>
        <button onClick={() => setShowPlan(!showPlan)}>Subscription Manager</button>
      </div>

      {showPlan && (
        <SubscriptionManager />
      )}

      <div>
        <button onClick={() => setEditPlans(!editPlans)}>Manage Plans</button>
      </div>

      {editPlans && (
        <PlanEditor />
      )}
      {/* 🔍 CONTROLS */}
      <div className="controls">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">All</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>

      <div className="layout">

        {/* 👤 USER GRID */}
        <div className="grid">
          {paginatedUsers.map(u => (
            <div key={u.id} className="user-card" onClick={() => setSelectedUser(u)}>
              <h4>{u.name}</h4>
              <p>{u.email}</p>

              <span className="badge" style={{ background: rolesColor[u.role] }}>
                {u.role}
              </span>

              <p>{u.isActive ? "🟢 Active" : "🔴 Inactive"}</p>

              {/* SUBSCRIPTION REQUEST */}
              {
                subscriptionRequests[u.id]?.some(
                  r => r.status === "pending"
                ) && (
                  <div
                    style={{
                      marginTop: "8px",
                      background: "#f59e0b",
                      color: "#000",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      display: "inline-block"
                    }}
                  >
                    🔔 Subscription Request
                  </div>
                )
              }
            </div>
          ))}
        </div>

        {/* 📄 DETAIL PANEL */}
        <div className="details">
          {selectedUser ? (
            <>
              <h3>{selectedUser.name}</h3>
              <p>{selectedUser.email}</p>

              {/* ✏️ EDIT MODE */}
              {selectedUser.editMode ? (
                <>
                  <input
                    value={selectedUser.name}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, name: e.target.value })
                    }
                  />

                  <input
                    value={selectedUser.shopName || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, shopName: e.target.value })
                    }
                  />

                  <textarea
                    value={selectedUser.address || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, address: e.target.value })
                    }
                  />

                  <input
                    value={selectedUser.pin || ""}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, pin: e.target.value })
                    }
                  />

                  <div className="actions">
                    <button
                      onClick={async () => {
                        await updateDoc(doc(db, "users", selectedUser.id), {
                          name: selectedUser.name,
                          shopName: selectedUser.shopName,
                          address: selectedUser.address,
                          pin: selectedUser.pin
                        });
                        setSelectedUser({ ...selectedUser, editMode: false });
                      }}
                    >
                      Save
                    </button>

                    <button
                      className="secondary"
                      onClick={() =>
                        setSelectedUser({ ...selectedUser, editMode: false })
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p><b>Shop:</b> {selectedUser.shopName}</p>
                  <p><b>Address:</b> {selectedUser.address}</p>

                  <div className="actions">
                    <button
                      onClick={() =>
                        setSelectedUser({ ...selectedUser, editMode: true })
                      }
                    >
                      Edit
                    </button>

                    <button onClick={() => toggleStatus(selectedUser)}>
                      Toggle Status
                    </button>

                    <button onClick={() => changeRole(selectedUser, "admin")}>
                      Make Admin
                    </button>

                    <button onClick={() => changeRole(selectedUser, "user")}>
                      Make User
                    </button>

                    <button
                      className="danger"
                      onClick={() => deleteUser(selectedUser)}
                    >
                      Delete
                    </button>
                  </div>

                  {/* REQUESTS */}
                  <h4 style={{ marginTop: "20px" }}>
                    Subscription Requests
                  </h4>

                  {
                    subscriptionRequests[selectedUser.id]?.length > 0 ? (

                      subscriptionRequests[selectedUser.id].map(req => (

                        <div
                          key={req.id}
                          style={{
                            background: "#1e293b",
                            padding: "10px",
                            borderRadius: "10px",
                            marginBottom: "10px",
                            border: "1px solid #334155"
                          }}
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

                          {
                            req.paymentImage && (
                              <a
                                href={req.paymentImage}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#60a5fa",
                                  fontSize: "12px"
                                }}
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
                  <h4>Subscription</h4>
                  <pre>
                    {JSON.stringify(selectedUser.subscription, null, 2)}
                  </pre>
                </>
              )}
            </>
          ) : (
            <p>Select a user</p>
          )}
        </div>
      </div>

      {/* 📁 PAGINATION */}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>{page} / {totalPages || 1}</span>
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>

      <style>{`
/* 🌌 ROOT */
.container {
  padding: 20px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  min-height: 100vh;
  color: #e2e8f0;
  font-family: 'Inter', sans-serif;
}

/* 📊 ANALYTICS */
.analytics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.card {
  background: #1e293b;
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  border: 1px solid #334155;
  transition: 0.3s;
}

.card:hover {
  transform: translateY(-3px);
  background: #334155;
}

/* 🔍 CONTROLS */
.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.controls input,
.controls select {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #020617;
  color: #fff;
}

.controls input::placeholder {
  color: #94a3b8;
}

/* 📦 LAYOUT */
.layout {
  display: flex;
  gap: 15px;
}

/* 👤 USER GRID */
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* 🧑 USER CARD */
.user-card {
  background: #1e293b;
  padding: 14px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid #334155;
  transition: 0.3s;
  position: relative;
}

.user-card:hover {
  transform: translateY(-4px);
  background: #334155;
}

.user-card h4 {
  margin-bottom: 5px;
  font-size: 15px;
}

.user-card p {
  font-size: 12px;
  color: #94a3b8;
}

/* 🏷 ROLE BADGE */
.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  margin-top: 5px;
}

/* 📄 DETAIL PANEL */
.details {
  width: 320px;
  background: #020617;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #334155;
  max-height: 80vh;
  overflow-y: auto;
}

/* 🧾 TEXT */
.details p {
  font-size: 13px;
  margin-bottom: 6px;
}

/* ✏️ FORM */
.details input,
.details textarea {
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: #020617;
  color: #fff;
}

/* ⚙️ ACTION BUTTONS */
.actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}

button {
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: 0.2s;
}

button:hover {
  transform: scale(1.03);
  opacity: 0.95;
}

button.secondary {
  background: #475569;
}

button.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

/* 📁 PAGINATION */
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.pagination button {
  padding: 6px 12px;
}

/* 📱 RESPONSIVE */
@media (max-width: 900px) {
  .layout {
    flex-direction: column;
  }

  .details {
    width: 100%;
  }
}
`}</style>

    </div>
  );
};

export default AdminDashboard;
