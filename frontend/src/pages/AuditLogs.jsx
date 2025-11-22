import { useState } from "react";

export default function AuditLogs() {
  const [search, setSearch] = useState("");

  // ✅ Example audit log data (to be replaced with backend data later)
  const logs = [
    { id: 1, user: "Admin John", action: "Registered CHW - Mary", date: "2025-08-15 10:30 AM" },
    { id: 2, user: "CHW Mary", action: "Registered Child - BC12345", date: "2025-08-16 2:45 PM" },
    { id: 3, user: "Admin Jane", action: "Removed CHW - Paul", date: "2025-08-17 11:10 AM" },
    { id: 4, user: "CHW Alex", action: "Updated Vaccination - Child BC67890", date: "2025-08-18 4:00 PM" },
  ];

  // ✅ Filter logs based on search
  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.date.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "auto",
        padding: "20px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#222", marginBottom: "20px" }}>
        🔍 System Audit Logs
      </h2>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search logs by user, action, or date..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "20px",
        }}
      />

      {/* Logs Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>User</th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>Action</th>
            <th style={{ padding: "12px", border: "1px solid #ddd" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ padding: "12px", border: "1px solid #ddd", color: "#333" }}>
                  {log.user}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd", color: "#555" }}>
                  {log.action}
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd", color: "#777" }}>
                  {log.date}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="3"
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#888",
                  fontStyle: "italic",
                }}
              >
                No logs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
