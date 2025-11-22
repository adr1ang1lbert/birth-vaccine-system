import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSyncLocalStorage } from "../hooks/useSyncLocalStorage";
import Modal from "../components/ui/Modal";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function Settings() {
  // ✅ Vaccination list synced with localStorage
  const [vaccines, setVaccines] = useSyncLocalStorage("vaccinationSettings", [
    { name: "BCG", interval: 0, mandatory: true },
    { name: "OPV 0 (Birth)", interval: 0, mandatory: true },
    { name: "OPV 1", interval: 6, mandatory: true },
    { name: "OPV 2", interval: 10, mandatory: true },
    { name: "OPV 3", interval: 14, mandatory: true },
    { name: "Pentavalent 1", interval: 6, mandatory: true },
    { name: "Pentavalent 2", interval: 10, mandatory: true },
    { name: "Pentavalent 3", interval: 14, mandatory: true },
    { name: "PCV 1", interval: 6, mandatory: true },
    { name: "PCV 2", interval: 10, mandatory: true },
    { name: "PCV 3", interval: 14, mandatory: true },
    { name: "Rotavirus 1", interval: 6, mandatory: true },
    { name: "Rotavirus 2", interval: 10, mandatory: true },
    { name: "Measles-Rubella 1", interval: 36, mandatory: true },
    { name: "Measles-Rubella 2", interval: 78, mandatory: true },
    { name: "Yellow Fever", interval: 78, mandatory: true },
  ]);

  const [newVaccine, setNewVaccine] = useState({ name: "", interval: "", mandatory: false });
  const [showPreview, setShowPreview] = useState(false);

  // ✅ Vaccine functions
  const addVaccine = () => {
    if (!newVaccine.name.trim() || !newVaccine.interval) {
      toast.error("⚠️ Please fill in all vaccine details.");
      return;
    }
    setVaccines([...vaccines, { ...newVaccine, interval: parseInt(newVaccine.interval) }]);
    setNewVaccine({ name: "", interval: "", mandatory: false });
    toast.success("💉 Vaccine added successfully!");
  };

  const updateVaccine = (index, field, value) => {
    const updated = [...vaccines];
    updated[index][field] = field === "interval" ? parseInt(value) : value;
    setVaccines(updated);
  };

  const removeVaccine = (index) => {
    if (vaccines[index].mandatory) {
      toast.warning("⚠️ This vaccine is mandatory and cannot be removed.");
      return;
    }
    setVaccines(vaccines.filter((_, i) => i !== index));
    toast.info("🗑️ Vaccine removed.");
  };

  // ✅ General settings states
  const [language, setLanguage] = useState("English");
  const [location, setLocation] = useState("Default County");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [defaultRole, setDefaultRole] = useState("CHW");
  const [requireApproval, setRequireApproval] = useState(true);

  // ✅ Notifications states (previously triggering linter)
  const [enableReminders, setEnableReminders] = useState(true);
  const [reminderInterval, setReminderInterval] = useState(2);
  const [smsReminders, setSmsReminders] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);

  // ✅ Reports
  const [autoReports, setAutoReports] = useState(true);
  const [defaultReportFormat, setDefaultReportFormat] = useState("PDF");

  // ✅ Security
  const [passwordPolicy, setPasswordPolicy] = useState("strong");
  const [sessionTimeout, setSessionTimeout] = useState(10);
  const [enableMFA, setEnableMFA] = useState(false);

  // ✅ Maintenance
  const [backupFrequency, setBackupFrequency] = useState("daily");

  // ✅ Save settings (local + Firestore)
  const handleSave = async (e) => {
    e.preventDefault();

    const settings = {
      system: { language, location, dateFormat },
      userRole: { defaultRole, requireApproval },
      notifications: { enableReminders, reminderInterval, smsReminders, emailReminders },
      reports: { autoReports, defaultReportFormat },
      security: { passwordPolicy, sessionTimeout, enableMFA },
      maintenance: { backupFrequency },
      vaccines,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("systemSettings", JSON.stringify(settings));
      await setDoc(doc(db, "system", "settings"), settings);
      toast.success("✅ Settings saved successfully!");
    } catch (error) {
      console.error("Firestore save error:", error);
      toast.error("❌ Failed to sync with Firestore.");
    }
  };

  // ✅ Reset
  const handleReset = () => {
    if (window.confirm("⚠️ Reset all settings to default?")) {
      localStorage.clear();
      toast.info("🔄 System reset complete.");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // ✅ Estimate due date helper
  const estimateDate = (weeks) => {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().split("T")[0];
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>⚙️ System Settings</h2>

      <form onSubmit={handleSave} style={{ display: "grid", gap: "30px" }}>
        {/* 🌍 System Config */}
        <section>
          <h3>🌍 System Configurations</h3>
          <label>Language:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option>
            <option>Kiswahili</option>
          </select>
          <br />
          <label>Default Location:</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
          <br />
          <label>Date Format:</label>
          <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          </select>
        </section>

        {/* 👩‍⚕️ Roles */}
        <section>
          <h3>👩‍⚕️ User Roles</h3>
          <label>Default Role:</label>
          <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value)}>
            <option value="CHW">CHW</option>
            <option value="Admin">Admin</option>
          </select>
          <br />
          <label>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
            />{" "}
            Require Admin Approval
          </label>
        </section>

        {/* 💉 Vaccination */}
        <section>
          <h3>💉 Vaccination Settings</h3>
          <button type="button" onClick={() => setShowPreview(true)} style={blueBtnStyle}>
            👁️ Preview Schedule
          </button>

          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f4f4f4" }}>
                <th>Vaccine</th>
                <th>Interval (weeks)</th>
                <th>Mandatory</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vaccines.map((v, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVaccine(index, "name", e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={v.interval}
                      onChange={(e) => updateVaccine(index, "interval", e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={v.mandatory}
                      onChange={(e) => updateVaccine(index, "mandatory", e.target.checked)}
                    />
                  </td>
                  <td>
                    {!v.mandatory && (
                      <button type="button" onClick={() => removeVaccine(index)} style={deleteBtnStyle}>
                        ❌ Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <input
              type="text"
              placeholder="Vaccine name"
              value={newVaccine.name}
              onChange={(e) => setNewVaccine({ ...newVaccine, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="Interval (weeks)"
              value={newVaccine.interval}
              onChange={(e) => setNewVaccine({ ...newVaccine, interval: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={newVaccine.mandatory}
                onChange={(e) => setNewVaccine({ ...newVaccine, mandatory: e.target.checked })}
              />{" "}
              Mandatory
            </label>
            <button type="button" onClick={addVaccine} style={addBtnStyle}>
              ➕ Add
            </button>
          </div>
        </section>

        {/* 🔔 Notifications */}
        <section>
          <h3>🔔 Notifications</h3>
          <label>
            <input
              type="checkbox"
              checked={enableReminders}
              onChange={(e) => setEnableReminders(e.target.checked)}
            />{" "}
            Enable Vaccination Reminders
          </label>
          <br />
          <label>
            Reminder Interval:{" "}
            <input
              type="number"
              min="1"
              value={reminderInterval}
              onChange={(e) => setReminderInterval(e.target.value)}
              style={{ width: "60px" }}
            />{" "}
            days before due date
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={smsReminders}
              onChange={(e) => setSmsReminders(e.target.checked)}
            />{" "}
            Enable SMS Reminders
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
            />{" "}
            Enable Email Reminders
          </label>
        </section>

        {/* 📊 Reports */}
        <section>
          <h3>📊 Reports</h3>
          <label>
            <input
              type="checkbox"
              checked={autoReports}
              onChange={(e) => setAutoReports(e.target.checked)}
            />{" "}
            Auto-generate Reports
          </label>
          <br />
          <label>
            Default Report Format:{" "}
            <select
              value={defaultReportFormat}
              onChange={(e) => setDefaultReportFormat(e.target.value)}
            >
              <option value="PDF">PDF</option>
              <option value="Excel">Excel</option>
              <option value="CSV">CSV</option>
            </select>
          </label>
        </section>

        {/* 🔐 Security */}
        <section>
          <h3>🔐 Security</h3>
          <label>Password Policy:</label>
          <select value={passwordPolicy} onChange={(e) => setPasswordPolicy(e.target.value)}>
            <option value="basic">Basic (min 6 chars)</option>
            <option value="strong">Strong (min 8 chars, symbols, numbers)</option>
          </select>
          <br />
          <label>
            Auto-logout after{" "}
            <input
              type="number"
              min="1"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              style={{ width: "60px" }}
            />{" "}
            minutes
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={enableMFA}
              onChange={(e) => setEnableMFA(e.target.checked)}
            />{" "}
            Enable MFA
          </label>
        </section>

        {/* 🛠️ Maintenance */}
        <section>
          <h3>🛠️ System Maintenance</h3>
          <label>Backup Frequency:</label>
          <select value={backupFrequency} onChange={(e) => setBackupFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <br />
          <button type="button" onClick={handleReset} style={deleteBtnStyle}>
            🔄 Reset System Data
          </button>
        </section>

        {/* 💾 Save */}
        <button type="submit" style={saveBtnStyle}>
          💾 Save All Settings
        </button>
      </form>

      {/* 📋 Vaccine Preview Modal */}
      {showPreview && (
        <Modal title="📋 Vaccination Schedule Preview" onClose={() => setShowPreview(false)}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Vaccine</th>
                <th>Interval (weeks)</th>
                <th>Mandatory</th>
                <th>Estimated Due Date</th>
              </tr>
            </thead>
            <tbody>
              {vaccines.map((v, i) => (
                <tr key={i}>
                  <td>{v.name}</td>
                  <td style={{ textAlign: "center" }}>{v.interval}</td>
                  <td style={{ textAlign: "center", color: v.mandatory ? "green" : "gray" }}>
                    {v.mandatory ? "✅ Yes" : "❌ No"}
                  </td>
                  <td style={{ textAlign: "center" }}>{estimateDate(v.interval)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}

      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}

// ✅ Styles
const containerStyle = {
  maxWidth: "1100px",
  margin: "auto",
  padding: "25px",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
};
const titleStyle = { textAlign: "center", color: "#2c3e50", marginBottom: "25px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginBottom: "10px" };
const blueBtnStyle = {
  background: "#1976D2",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  marginBottom: "10px",
};
const addBtnStyle = {
  background: "#4CAF50",
  color: "white",
  padding: "8px 12px",
  borderRadius: "5px",
  border: "none",
  cursor: "pointer",
};
const deleteBtnStyle = {
  background: "#F44336",
  color: "white",
  padding: "8px 12px",
  borderRadius: "5px",
  border: "none",
  cursor: "pointer",
};
const saveBtnStyle = {
  background: "#2196F3",
  color: "white",
  padding: "12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "16px",
};