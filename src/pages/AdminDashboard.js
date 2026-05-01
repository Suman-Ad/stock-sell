import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query
} from "firebase/firestore";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStocks, setUserStocks] = useState([]);

  // Load users
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

  // Load selected user stocks
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

  // Toggle active status
  const toggleUserStatus = async (user) => {
    await updateDoc(doc(db, "users", user.id), {
      isActive: !user.isActive
    });
  };

  // Change role
  const changeRole = async (userId, role) => {
    await updateDoc(doc(db, "users", userId), {
      role
    });
  };

  // Update subscription
  const updateSubscription = async (userId, plan) => {
    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1); // 1 month plan

    await updateDoc(doc(db, "users", userId), {
      subscription: {
        plan,
        startDate: now,
        endDate: end,
        status: "active"
      }
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Dashboard</h2>

      <div style={{ display: "flex", gap: "20px" }}>

        {/* USER LIST */}
        <div style={{ width: "40%" }}>
          <h3>Users</h3>

          {users.map(user => (
            <div
              key={user.id}
              style={{
                border: "1px solid #ccc",
                padding: "10px",
                marginBottom: "10px",
                cursor: "pointer",
                background: selectedUser?.id === user.id ? "#eef" : "#fff"
              }}
              onClick={() => setSelectedUser(user)}
            >
              <b>{user.name}</b><br />
              {user.email}<br />

              Role:
              <select
                value={user.role}
                onChange={(e) => changeRole(user.id, e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>

              <br />

              Status:
              <button onClick={() => toggleUserStatus(user)}>
                {user.isActive ? "Deactivate" : "Activate"}
              </button>

              <br />

              Subscription:
              <button onClick={() => updateSubscription(user.id, "pro")}>
                Set Pro
              </button>
            </div>
          ))}
        </div>

        {/* USER DETAILS */}
        <div style={{ width: "60%" }}>
          {selectedUser ? (
            <>
              <h3>User Details</h3>

              <p><b>Name:</b> {selectedUser.name}</p>
              <p><b>Email:</b> {selectedUser.email}</p>
              <p><b>Role:</b> {selectedUser.role}</p>
              <p><b>Status:</b> {selectedUser.isActive ? "Active" : "Inactive"}</p>

              <h4>Subscription</h4>
              <pre>
                {JSON.stringify(selectedUser.subscription, null, 2)}
              </pre>

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