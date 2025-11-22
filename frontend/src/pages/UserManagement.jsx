import { useState, useEffect } from "react";
import BackButton from "../components/BackButton";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getFirestore, collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import app from "../firebase/firebaseConfig";

export default function UserManagement() {
  const db = getFirestore(app);

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);

  // 🔄 Load users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("❌ Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [db]);

  // 🔍 Search & Filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "All" ? true : u.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ✅ Update user status (approve, deactivate, reactivate)
  const updateUserStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "users", id), { status });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status } : u))
      );

      let msg =
        status === "Active"
          ? "✅ User activated successfully!"
          : status === "Inactive"
          ? "⚠️ User deactivated."
          : "❌ User rejected.";

      toast.info(msg);
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("❌ Failed to update user status");
    }
  };

  // 🗑️ Permanently remove user
  const removeUser = async (id) => {
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.warn("🗑️ User removed permanently.");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("❌ Failed to remove user");
    }
  };

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "auto",
        padding: "20px",
        background: "#ffffff",
        color: "#222",
        borderRadius: "12px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.1)",
      }}
    >
      <BackButton />
      <h2 style={{ textAlign: "center", color: "#111", marginBottom: "25px" }}>
        👥 User Management
      </h2>

      {/* 🔍 Search & Filter Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: "1",
            minWidth: "250px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Pending Approval">Pending Approval</option>
        </select>
      </div>

      {/* 📋 User Table */}
      {loading ? (
        <p style={{ textAlign: "center", padding: "20px" }}>Loading users...</p>
      ) : filteredUsers.length === 0 ? (
        <p style={{ textAlign: "center", padding: "20px" }}>
          No users match your search or filter.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Name</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Email</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Role</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{u.name}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{u.email}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{u.role}</td>
                <td
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    color:
                      u.status === "Active"
                        ? "#4CAF50"
                        : u.status === "Pending Approval"
                        ? "#FFC107"
                        : "#F44336",
                    fontWeight: "bold",
                  }}
                >
                  {u.status}
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {u.status === "Pending Approval" && (
                    <button
                      onClick={() => updateUserStatus(u.id, "Active")}
                      style={{
                        marginRight: "5px",
                        background: "#4CAF50",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Approve
                    </button>
                  )}

                  {u.status === "Active" && (
                    <button
                      onClick={() => updateUserStatus(u.id, "Inactive")}
                      style={{
                        marginRight: "5px",
                        background: "#FFC107",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Deactivate
                    </button>
                  )}

                  {u.status === "Inactive" && (
                    <button
                      onClick={() => updateUserStatus(u.id, "Active")}
                      style={{
                        marginRight: "5px",
                        background: "#4CAF50",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Reactivate
                    </button>
                  )}

                  <button
                    onClick={() => removeUser(u.id)}
                    style={{
                      background: "#F44336",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}