import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function HelpSupport() {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("General");
  const [ticketId, setTicketId] = useState(null);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [supportTickets, setSupportTickets] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch tickets in real-time from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "supportTickets"), (snapshot) => {
      const tickets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSupportTickets(tickets);
    });

    return () => unsubscribe(); // clean up listener on unmount
  }, []);

  // ✅ Submit support request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("⚠️ Please provide more details in your message.");
      return;
    }

    const newTicket = {
      category,
      message,
      createdAt: serverTimestamp(),
      status: "Open 🟡",
    };

    try {
      const docRef = await addDoc(collection(db, "supportTickets"), newTicket);
      setTicketId(docRef.id);
      setMessage("");
      toast.success("✅ Support ticket submitted successfully!");
    } catch (error) {
      console.error("Error adding document:", error);
      toast.error("❌ Failed to submit support ticket.");
    }
  };

  // ✅ Mark a ticket as resolved
  const handleResolve = async (id) => {
    try {
      const ticketRef = doc(db, "supportTickets", id);
      await updateDoc(ticketRef, {
        status: "Resolved 🟢",
        resolvedAt: serverTimestamp(),
      });
      toast.success("🎉 Ticket marked as resolved!");
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("❌ Failed to update ticket status.");
    }
  };

  const faqs = [
    { q: "How do I register a child?", a: "Go to the 'Registration' page and fill in the child’s details.", link: "/registration" },
    { q: "How do I update vaccination status?", a: "Visit 'Vaccination Update' and search for the child.", link: "/vaccination-update" },
    { q: "Where can I see missed vaccines?", a: "Go to 'Notifications' to view missed or upcoming vaccines.", link: "/notifications" },
    { q: "Who can access Admin features?", a: "Only authorized administrators with valid credentials.", link: null },
  ];

  const statusColor = (status) => {
    if (status.includes("Resolved")) return { color: "green", fontWeight: "bold" };
    if (status.includes("Open")) return { color: "orange", fontWeight: "bold" };
    return {};
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "30px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.1)",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          background: "linear-gradient(90deg, #4CAF50, #388E3C)",
          color: "white",
          padding: "14px",
          borderRadius: "8px",
        }}
      >
        🆘 Help & Support
      </h2>

      {/* FAQ Section */}
      <div style={{ marginTop: "25px" }}>
        <h3 style={{ color: "#333" }}>📌 Frequently Asked Questions</h3>
        {faqs.map((faq, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ddd",
              borderRadius: "6px",
              margin: "10px 0",
              padding: "12px",
              background: "#fafafa",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
          >
            <strong>❓ {faq.q}</strong>
            {openFAQ === index && (
              <p style={{ marginTop: "8px", color: "#555" }}>
                ✅ {faq.a}{" "}
                {faq.link && (
                  <button
                    onClick={() => navigate(faq.link)}
                    style={{
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "5px 10px",
                      marginLeft: "10px",
                      cursor: "pointer",
                    }}
                  >
                    Go
                  </button>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Contact Info */}
      <div style={{ marginTop: "25px" }}>
        <h3 style={{ color: "#333" }}>📞 Contact Support</h3>
        <p>
          Email:{" "}
          <a href="mailto:support@vaccine-system.com" style={{ color: "#2196F3" }}>
            support@vaccine-system.com
          </a>
        </p>
        <p>Phone: +254 700 000 000</p>
      </div>

      {/* Support Form */}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "15px", marginTop: "20px" }}>
        <label style={{ fontWeight: "600", color: "#333" }}>Select Category:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="General">General</option>
          <option value="Registration">Child Registration</option>
          <option value="Vaccination">Vaccination Update</option>
          <option value="Notifications">Notifications</option>
          <option value="Account">Account / Login</option>
          <option value="Other">Other</option>
        </select>

        <label style={{ fontWeight: "600", color: "#333" }}>Describe Your Issue:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your support request here..."
          required
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            minHeight: "120px",
          }}
        />

        <button
          type="submit"
          style={{
            background: "#2196F3",
            color: "white",
            padding: "12px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          🚀 Submit Request
        </button>
      </form>

      {/* Ticket Confirmation */}
      {ticketId && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            background: "#E8F5E9",
            border: "1px solid #4CAF50",
            borderRadius: "6px",
            color: "#2E7D32",
          }}
        >
          ✅ Support request submitted. Ticket ID: <strong>{ticketId}</strong>
        </div>
      )}

      {/* Ticket History */}
      {supportTickets.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h3 style={{ color: "#333", marginBottom: "10px" }}>📜 Support Ticket History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#4CAF50", color: "white" }}>
                <th style={{ padding: "10px" }}>Ticket ID</th>
                <th style={{ padding: "10px" }}>Category</th>
                <th style={{ padding: "10px" }}>Message</th>
                <th style={{ padding: "10px" }}>Date</th>
                <th style={{ padding: "10px" }}>Status</th>
                <th style={{ padding: "10px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {supportTickets.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                  <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{t.id}</td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{t.category}</td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #ddd",
                      maxWidth: "250px",
                      overflowWrap: "break-word",
                    }}
                  >
                    {t.message}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                    {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : "Pending..."}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #ddd", ...statusColor(t.status) }}>
                    {t.status}
                  </td>
                  <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                    {t.status?.includes("Open") && (
                      <button
                        onClick={() => handleResolve(t.id)}
                        style={{
                          background: "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        ✅ Mark Resolved
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}