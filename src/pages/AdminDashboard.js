// import React, { useEffect, useState } from "react";
// import { db } from "../firebase";
// import {
//   collection,
//   onSnapshot,
//   doc,
//   updateDoc,
//   query,
//   deleteDoc
// } from "firebase/firestore";

// const hasHigherRole = (currentUser, targetUser) => {
//   const roles = { user: 1, admin: 2, superadmin: 3 };
//   return roles[currentUser.role] > roles[targetUser.role];
// };

// const AdminDashboard = ({ user }) => {
//   const [users, setUsers] = useState([]);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [userStocks, setUserStocks] = useState([]);
//   const [editMode, setEditMode] = useState(false);
//   const [editData, setEditData] = useState({});

//   // 🔥 Load users
//   useEffect(() => {
//     const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
//       const data = snapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       }));
//       setUsers(data);
//     });

//     return () => unsubscribe();
//   }, []);

//   // 🔥 Load selected user stocks
//   useEffect(() => {
//     if (!selectedUser) return;

//     const unsubscribe = onSnapshot(query(collection(db, "stocks")), (snapshot) => {
//       const data = snapshot.docs
//         .map(doc => ({ id: doc.id, ...doc.data() }))
//         .filter(s => s.userId === selectedUser.id);

//       setUserStocks(data);
//     });

//     return () => unsubscribe();
//   }, [selectedUser]);

//   // 🔧 Common validations
//   const canModify = (u) => {
//     if (user.id === u.id) return false;
//     if (u.role === "superadmin" && user.role !== "superadmin") return false;
//     return true;
//   };

//   // ✅ Actions
//   const toggleUserStatus = async (u) => {
//     if (!canModify(u)) return alert("Permission denied!");
//     await updateDoc(doc(db, "users", u.id), {
//       isActive: !u.isActive
//     });
//   };

//   const promoteUser = async (u) => {
//     if (!canModify(u)) return alert("Permission denied!");
//     await updateDoc(doc(db, "users", u.id), { role: "admin" });
//   };

//   const demoteUser = async (u) => {
//     if (!canModify(u)) return alert("Permission denied!");
//     await updateDoc(doc(db, "users", u.id), { role: "user" });
//   };

//   const deleteUser = async (u) => {
//     if (!canModify(u)) return alert("Permission denied!");
//     if (!window.confirm("Delete this user permanently?")) return;

//     await deleteDoc(doc(db, "users", u.id));
//     if (selectedUser?.id === u.id) setSelectedUser(null);
//   };

//   const startEdit = (u) => {
//     setEditMode(true);
//     setEditData(u);
//   };

//   const saveEdit = async () => {
//     await updateDoc(doc(db, "users", editData.id), {
//       name: editData.name,
//       shopName: editData.shopName,
//       address: editData.address,
//       pin: editData.pin
//     });
//     setEditMode(false);
//   };

//   return (
//     <div className="admin-container">

//       <h2 className="title">⚙️ Admin Dashboard</h2>

//       <div className="layout">

//         {/* 🔵 USER LIST */}
//         <div className="user-list">
//           <h3>Users</h3>

//           {users.map(u => (
//             <div
//               key={u.id}
//               className={`user-card ${selectedUser?.id === u.id ? "active" : ""}`}
//               onClick={() => setSelectedUser(u)}
//             >
//               <div className="user-info">
//                 <b>{u.name}</b>
//                 <span>{u.email}</span>
//                 <span className="meta">
//                   {u.role} • {u.isActive ? "🟢 Active" : "🔴 Inactive"}
//                 </span>
//               </div>

//               <div className="actions">
//                 <button onClick={(e) => { e.stopPropagation(); toggleUserStatus(u); }}>
//                   {u.isActive ? "Deactivate" : "Activate"}
//                 </button>

//                 <button
//                   disabled={!hasHigherRole(user, u)}
//                   onClick={(e) => { e.stopPropagation(); promoteUser(u); }}
//                 >
//                   Promote
//                 </button>

//                 <button onClick={(e) => { e.stopPropagation(); demoteUser(u); }}>
//                   Demote
//                 </button>

//                 <button onClick={(e) => { e.stopPropagation(); startEdit(u); }}>
//                   Edit
//                 </button>

//                 <button
//                   className="danger"
//                   onClick={(e) => { e.stopPropagation(); deleteUser(u); }}
//                 >
//                   Delete
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* 🟢 DETAILS */}
//         <div className="details">
//           {selectedUser ? (
//             <>
//               <h3>User Details</h3>

//               {editMode ? (
//                 <div className="form">
//                   <input
//                     value={editData.name}
//                     onChange={(e) => setEditData({ ...editData, name: e.target.value })}
//                     placeholder="Name"
//                   />
//                   <input
//                     value={editData.shopName}
//                     onChange={(e) => setEditData({ ...editData, shopName: e.target.value })}
//                     placeholder="Shop Name"
//                   />
//                   <textarea
//                     value={editData.address}
//                     onChange={(e) => setEditData({ ...editData, address: e.target.value })}
//                     placeholder="Address"
//                   />
//                   <input
//                     value={editData.pin}
//                     onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
//                     placeholder="PIN"
//                   />

//                   <div className="form-actions">
//                     <button onClick={saveEdit}>Save</button>
//                     <button className="secondary" onClick={() => setEditMode(false)}>Cancel</button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="info-box">
//                   <p><b>Name:</b> {selectedUser.name}</p>
//                   <p><b>Email:</b> {selectedUser.email}</p>
//                   <p><b>Shop:</b> {selectedUser.shopName}</p>
//                   <p><b>Address:</b> {selectedUser.address}</p>
//                   <p><b>PIN:</b> {selectedUser.pin}</p>
//                   <p><b>Role:</b> {selectedUser.role}</p>
//                   <p><b>Status:</b> {selectedUser.isActive ? "Active" : "Inactive"}</p>

//                   <h4>Subscription</h4>
//                   <pre>{JSON.stringify(selectedUser.subscription, null, 2)}</pre>
//                 </div>
//               )}

//               <h4>User Stocks</h4>
//               <div className="stocks">
//                 {userStocks.map(stock => (
//                   <div key={stock.id} className="stock-card">
//                     <b>{stock.catalogId}</b>

//                     {Object.entries(stock.sizes || {}).map(([size, data]) => (
//                       <div key={size}>
//                         {size} → Qty: {data.qty} | ₹{data.sellingPrice}
//                       </div>
//                     ))}
//                   </div>
//                 ))}
//               </div>
//             </>
//           ) : (
//             <p>Select a user to view details</p>
//           )}
//         </div>
//       </div>

//       {/* 🎨 CSS */}
//       <style>{`
//         .admin-container {
//           padding: 20px;
//           font-family: 'Segoe UI', sans-serif;
//           background: #f5f7fb;
//         }

//         .title {
//           margin-bottom: 20px;
//         }

//         .layout {
//           display: flex;
//           gap: 20px;
//         }

//         .user-list {
//           width: 35%;
//           max-height: 80vh;
//           overflow-y: auto;
//         }

//         .user-card {
//           background: #fff;
//           padding: 12px;
//           border-radius: 10px;
//           margin-bottom: 10px;
//           cursor: pointer;
//           box-shadow: 0 2px 8px rgba(0,0,0,0.05);
//           transition: 0.2s;
//         }

//         .user-card:hover {
//           transform: translateY(-2px);
//         }

//         .user-card.active {
//           border: 2px solid #4f46e5;
//         }

//         .user-info span {
//           display: block;
//           font-size: 12px;
//           color: #666;
//         }

//         .meta {
//           margin-top: 4px;
//         }

//         .actions {
//           margin-top: 10px;
//           display: flex;
//           flex-wrap: wrap;
//           gap: 5px;
//         }

//         button {
//           padding: 5px 8px;
//           border: none;
//           border-radius: 6px;
//           background: #4f46e5;
//           color: white;
//           cursor: pointer;
//           font-size: 12px;
//         }

//         button:hover {
//           opacity: 0.9;
//         }

//         button.secondary {
//           background: gray;
//         }

//         button.danger {
//           background: #dc2626;
//         }

//         .details {
//           width: 65%;
//           background: #fff;
//           padding: 20px;
//           border-radius: 12px;
//           box-shadow: 0 4px 12px rgba(0,0,0,0.05);
//           max-height: 80vh;
//           overflow-y: auto;
//         }

//         .form input, .form textarea {
//           width: 100%;
//           margin-bottom: 10px;
//           padding: 8px;
//           border-radius: 6px;
//           border: 1px solid #ccc;
//         }

//         .form-actions {
//           display: flex;
//           gap: 10px;
//         }

//         .stock-card {
//           border-bottom: 1px solid #eee;
//           padding: 8px 0;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default AdminDashboard;

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
  deleteDoc
} from "firebase/firestore";

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
    const revenue = users.reduce((sum, u) => sum + (u.subscription?.amount || 0), 0);
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

  return (
    <div className="container">

      {/* 📊 ANALYTICS */}
      <div className="analytics">
        <div className="card">👥 {analytics.total} Users</div>
        <div className="card">🟢 {analytics.active} Active</div>
        <div className="card">🧑‍💼 {analytics.admins} Admins</div>
        <div className="card">💰 ₹{analytics.revenue}</div>
      </div>

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
