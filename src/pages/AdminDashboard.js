import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  deleteDoc
} from "firebase/firestore";

const hasHigherRole = (currentUser, targetUser) => {
  const roles = {
    user: 1,
    admin: 2,
    superadmin: 3
  };

  return roles[currentUser.role] > roles[targetUser.role];
};

const AdminDashboard = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStocks, setUserStocks] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  // 🔥 Load users
  useEffect(() => {
    const q = query(collection(db, "users"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Load stocks of selected user
  useEffect(() => {
    if (!selectedUser) return;

    const q = query(collection(db, "stocks"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.userId === selectedUser.id);

      setUserStocks(data);
    });

    return () => unsubscribe();
  }, [selectedUser]);

  // ✅ Toggle active
  const toggleUserStatus = async (u) => {
    if (user.id === u.id) {
      alert("You cannot modify your own role/status!");
      return;
    }
    if (u.role === "superadmin" && user.role !== "superadmin") {
      alert("Only Super Admin can modify another Super Admin");
      return;
    }
    await updateDoc(doc(db, "users", u.id), {
      isActive: !u.isActive
    });
  };

  // ✅ Promote / Demote
  const promoteUser = async (u) => {
    if (user.id === u.id) {
      alert("You cannot modify your own role/status!");
      return;
    }
    if (u.role === "superadmin" && user.role !== "superadmin") {
      alert("Only Super Admin can modify another Super Admin");
      return;
    }
    await updateDoc(doc(db, "users", u.id), {
      role: "admin"
    });
  };

  const demoteUser = async (u) => {
    if (user.id === u.id) {
      alert("You cannot modify your own role/status!");
      return;
    }
    if (u.role === "superadmin" && user.role !== "superadmin") {
      alert("Only Super Admin can modify another Super Admin");
      return;
    }
    await updateDoc(doc(db, "users", u.id), {
      role: "user"
    });
  };

  // ✅ Delete user
  const deleteUser = async (u) => {
    if (user.id === u.id) {
      alert("You cannot delete yourself!");
      return;
    }
    if (u.role === "superadmin" && user.role !== "superadmin") {
      alert("Only Super Admin can modify another Super Admin");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    await deleteDoc(doc(db, "users", u.id));

    if (selectedUser?.id === u.id) {
      setSelectedUser(null);
    }
  };

  // ✅ Start edit
  const startEdit = (u) => {
    setEditMode(true);
    setEditData(u);
  };

  // ✅ Save edit
  const saveEdit = async () => {
    await updateDoc(doc(db, "users", editData.id), {
      name: editData.name,
      shopName: editData.shopName,
      address: editData.address,
      pin: editData.pin
    });

    setEditMode(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Dashboard</h2>

      <div style={{ display: "flex", gap: "20px" }}>

        {/* 🔵 USER LIST */}
        <div style={{ width: "40%" }}>
          <h3>Users</h3>

          {users.map(u => (
            <div
              key={u.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px",
                background: selectedUser?.id === u.id ? "#eef" : "#fff"
              }}
              onClick={() => setSelectedUser(u)}
            >
              <b>{u.name}</b><br />
              {u.email}<br />
              Role: {u.role}<br />
              Status: {u.isActive ? "Active" : "Inactive"}

              <br /><br />

              {/* 🔥 Actions */}
              <button onClick={(e) => { e.stopPropagation(); toggleUserStatus(u); }}>
                {u.isActive ? "Deactivate" : "Activate"}
              </button>

              <button
                disabled={!hasHigherRole(user, u)}
                onClick={(e) => {
                  e.stopPropagation();
                  promoteUser(u);
                }}
              >
                Promote
              </button>

              <button onClick={(e) => { e.stopPropagation(); demoteUser(u); }}>
                Demote
              </button>

              <button onClick={(e) => { e.stopPropagation(); startEdit(u); }}>
                Edit
              </button>

              <button
                style={{ color: "red" }}
                onClick={(e) => { e.stopPropagation(); deleteUser(u); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* 🟢 USER DETAILS */}
        <div style={{ width: "60%" }}>
          {selectedUser ? (
            <>
              <h3>User Details</h3>

              {editMode ? (
                <>
                  <input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                  <br /><br />

                  <input
                    value={editData.shopName}
                    onChange={(e) => setEditData({ ...editData, shopName: e.target.value })}
                  />
                  <br /><br />

                  <textarea
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  />
                  <br /><br />

                  <input
                    value={editData.pin}
                    onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                  />

                  <br /><br />

                  <button onClick={saveEdit}>Save</button>
                  <button onClick={() => setEditMode(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <p><b>Name:</b> {selectedUser.name}</p>
                  <p><b>Email:</b> {selectedUser.email}</p>
                  <p><b>Shop:</b> {selectedUser.shopName}</p>
                  <p><b>Address:</b> {selectedUser.address}</p>
                  <p><b>PIN:</b> {selectedUser.pin}</p>
                  <p><b>Role:</b> {selectedUser.role}</p>
                  <p><b>Status:</b> {selectedUser.isActive ? "Active" : "Inactive"}</p>

                  <h4>Subscription</h4>
                  <pre>
                    {JSON.stringify(selectedUser.subscription, null, 2)}
                  </pre>
                </>
              )}

              {/* 🔥 STOCKS */}
              <h4>User Stocks</h4>

              {userStocks.map(stock => (
                <div key={stock.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <b>{stock.catalogId}</b>

                  {Object.entries(stock.sizes || {}).map(([size, data]) => (
                    <div key={size}>
                      {size} → Qty: {data.qty} | ₹{data.sellingPrice}
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <p>Select a user to view details</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;