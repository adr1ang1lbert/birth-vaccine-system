// frontend/src/pages/Notifications.jsx

import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function Notifications() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All"); // now used
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  // System settings (static for now)
  const reminderInterval = 2;
  const smsEnabled = true;
  const emailEnabled = true;

  // Fetch reminders
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        setLoading(true);

        const childrenSnap = await getDocs(collection(db, "children"));
        const all = [];

        for (const childDoc of childrenSnap.docs) {
          const child = { id: childDoc.id, ...childDoc.data() };

          const scheduleSnap = await getDocs(
            collection(db, `children/${child.id}/schedule`)
          );

          scheduleSnap.forEach((vaccine) => {
            const v = vaccine.data();
            if (v.status === "Given") return;

            const due = new Date(v.dueDate);
            if (isNaN(due)) return;

            const diff = Math.floor((due - new Date()) / (1000 * 60 * 60 * 24));

            let status = "";
            if (diff < 0) status = "Missed";
            else if (diff === 0) status = "Due Today";
            else if (diff <= reminderInterval) status = "Upcoming";
            else return;

            all.push({
              id: `${child.id}-${v.vaccine}`,
              childId: child.id,
              childName: child.childName,
              contact: child.contact,
              guardianEmail: child.guardianEmail,
              vaccineId: vaccine.id,
              vaccine: v.vaccine,
              dueDate: v.dueDate,
              status,
            });
          });
        }

        setReminders(all);
      } catch (e) {
        console.error("Error loading reminders:", e); // FIX: using the error
        toast.error("Failed to load vaccine reminders.");
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  // Email reminder
  const sendEmailReminder = async (reminder) => {
    if (!emailEnabled) return toast.error("Email reminders are disabled.");

    try {
      const res = await fetch("http://localhost:5001/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminder),
      });

      if (!res.ok) throw new Error("Email failed.");

      toast.success("📧 Email sent successfully!");
    } catch (e) {
      console.error(e); // FIX: using error
      toast.error("Server error: email not sent.");
    }
  };

  // SMS reminder
  const sendSmsReminder = async (reminder) => {
    if (!smsEnabled) return toast.error("SMS reminders are disabled.");

    try {
      const res = await fetch("http://localhost:5001/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminder),
      });

      if (!res.ok) throw new Error("SMS failed.");

      toast.success("📱 SMS sent successfully!");
    } catch (e) {
      console.error(e); // FIX: using error
      toast.error("Server error: SMS not sent.");
    }
  };

  // 🔍 FILTER + SEARCH FIX (filter was unused before)
  const filteredReminders = reminders.filter((r) => {
    const searchMatch =
      r.childName.toLowerCase().includes(search.toLowerCase()) ||
      r.childId.toLowerCase().includes(search.toLowerCase());

    const filterMatch =
      filter === "All" ? true : r.status === filter;

    return searchMatch && filterMatch;
  });

  return (
    <div style={{ maxWidth: "950px", margin: "40px auto" }}>
      <h2 style={{ textAlign: "center", color: "#4CAF50" }}>
        📢 Notifications & Alerts
      </h2>

      {/* Search + Filter */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="Search by child's name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px", width: "60%" }}
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "10px" }}
        >
          <option value="All">All</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Due Today">Due Today</option>
          <option value="Missed">Missed</option>
        </select>
      </div>

      {loading ? (
        <p>Loading reminders...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#4CAF50", color: "#fff" }}>
              <th>Child</th>
              <th>Vaccine</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredReminders.map((r) => (
              <tr key={r.id}>
                <td>{r.childName}</td>
                <td>{r.vaccine}</td>
                <td>{r.dueDate}</td>
                <td>{r.status}</td>
                <td>
                  {emailEnabled && (
                    <button
                      onClick={() => sendEmailReminder(r)}
                      style={{
                        marginRight: 6,
                        background: "#2196F3",
                        color: "#fff",
                        padding: "6px 12px",
                      }}
                    >
                      📧 Email
                    </button>
                  )}

                  {smsEnabled && (
                    <button
                      onClick={() => sendSmsReminder(r)}
                      style={{
                        background: "#4CAF50",
                        color: "#fff",
                        padding: "6px 12px",
                      }}
                    >
                      📱 SMS
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ToastContainer position="top-center" />
    </div>
  );
}