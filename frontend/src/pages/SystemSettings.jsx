import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SystemSettings() {
  const navigate = useNavigate();

  // Example state for system settings
  const [settings, setSettings] = useState({
    notificationFrequency: "Weekly",
    reportFormat: "PDF",
    maintenanceMode: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = () => {
    console.log("✅ Saved system settings:", settings);
    alert("System settings saved successfully!");
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "auto",
        padding: "30px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.15)",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#222", marginBottom: "20px" }}>
        ⚙️ System Settings
      </h2>

      {/* Notification Frequency */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#333" }}>
          Notification Frequency
        </label>
        <select
          name="notificationFrequency"
          value={settings.notificationFrequency}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </div>

      {/* Report Format */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px", color: "#333" }}>
          Default Report Format
        </label>
        <select
          name="reportFormat"
          value={settings.reportFormat}
          onChange={handleChange}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        >
          <option value="PDF">PDF</option>
          <option value="Excel">Excel</option>
          <option value="CSV">CSV</option>
        </select>
      </div>

      {/* Maintenance Mode */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ color: "#333" }}>
          <input
            type="checkbox"
            name="maintenanceMode"
            checked={settings.maintenanceMode}
            onChange={handleChange}
            style={{ marginRight: "10px" }}
          />
          Enable Maintenance Mode
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        style={{
          background: "#4CAF50",
          color: "white",
          padding: "12px 20px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          width: "100%",
          fontSize: "16px",
        }}
        onMouseOver={(e) => (e.target.style.background = "#45a049")}
        onMouseOut={(e) => (e.target.style.background = "#4CAF50")}
      >
        💾 Save Settings
      </button>

      {/* Back to Admin Dashboard */}
      <button
        onClick={() => navigate("/admin-dashboard")}
        style={{
          marginTop: "15px",
          background: "#2196F3",
          color: "white",
          padding: "12px 20px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          width: "100%",
          fontSize: "16px",
        }}
        onMouseOver={(e) => (e.target.style.background = "#1976D2")}
        onMouseOut={(e) => (e.target.style.background = "#2196F3")}
      >
        🔙 Back to Admin Dashboard
      </button>
    </div>
  );
}
