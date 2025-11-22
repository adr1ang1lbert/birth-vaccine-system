import React from "react"; // Required for JSX
import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function VaccinationUpdate() {
  const [searchId, setSearchId] = useState("");
  const [childDetails, setChildDetails] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [doseDetails, setDoseDetails] = useState({
    date: "",
    batch: "",
    healthWorker: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  // 🔍 Fetch child + vaccination schedule from Firestore
  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast.error("⚠️ Enter a valid Child ID (e.g., VAC-KE-...)");
      return;
    }

    try {
      setLoading(true);
      const childRef = doc(db, "children", searchId.trim());
      const childSnap = await getDoc(childRef);

      if (!childSnap.exists()) {
        setChildDetails(null);
        setVaccines([]);
        toast.error("❌ No record found for this Child ID.");
        return;
      }

      setChildDetails(childSnap.data());

      // ✅ Fetch vaccination schedule and store Firestore doc IDs separately
      const scheduleRef = collection(db, `children/${searchId.trim()}/schedule`);
      const snapshot = await getDocs(scheduleRef);
      const data = snapshot.docs.map((docItem) => ({
        docId: docItem.id, // ✅ Firestore auto ID
        ...docItem.data(),
      }));

      // ✅ Sort vaccines: Pending first, then Given/Missed
      const sorted = data.sort((a, b) => {
        const order = { Pending: 1, "Given ✅": 2, Missed: 3 };
        return (order[a.status] || 4) - (order[b.status] || 4);
      });

      setVaccines(sorted);
      toast.success("✅ Child data loaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error fetching records.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mark vaccine as given
  const confirmMarkAsGiven = async (docId) => {
    if (!doseDetails.date || !doseDetails.batch || !doseDetails.healthWorker) {
      toast.error("⚠️ Please fill all dose details before saving.");
      return;
    }

    try {
      // Update in local state first
      const updatedVaccines = vaccines.map((v) =>
        v.docId === docId
          ? {
              ...v,
              status: "Given ✅",
              dateGiven: doseDetails.date,
              batch: doseDetails.batch,
              healthWorker: doseDetails.healthWorker,
              notes: doseDetails.notes,
              updatedAt: new Date().toISOString(),
            }
          : v
      );

      setVaccines(updatedVaccines);

      // 🔥 Update Firestore document using real docId
      const doseRef = doc(db, `children/${searchId.trim()}/schedule/${docId}`);
      await updateDoc(doseRef, {
        status: "Given ✅",
        dateGiven: doseDetails.date,
        batch: doseDetails.batch,
        healthWorker: doseDetails.healthWorker,
        notes: doseDetails.notes,
        updatedAt: new Date().toISOString(),
      });

      toast.success("💉 Vaccine marked as given successfully!");
      setConfirmModal(null);
      setDoseDetails({ date: "", batch: "", healthWorker: "", notes: "" });
    } catch (err) {
      console.error(err);
      toast.error("❌ Error updating vaccine status. Check if this dose exists in Firestore.");
    }
  };

  // ✅ Progress Tracker
  const completed = vaccines.filter((v) => v.status?.includes("Given")).length;
  const total = vaccines.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 🎨 Status Color
  const statusStyle = (status) => {
    if (status?.includes("Pending")) return { color: "#ff9800", fontWeight: "bold" };
    if (status?.includes("Given")) return { color: "#4caf50", fontWeight: "bold" };
    if (status?.includes("Missed")) return { color: "#f44336", fontWeight: "bold" };
    return { color: "#000" };
  };

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "auto",
        padding: "25px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#2c3e50" }}>💉 Vaccination Update</h2>

      {/* Search Bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter Child ID (e.g., VAC-KE-...)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "16px",
            color: "#000",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            background: "#4CAF50",
            color: "white",
            border: "none",
            padding: "12px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Child Details */}
      {childDetails && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            background: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        >
          <h3 style={{ marginBottom: "10px", color: "#4CAF50" }}>Child Details</h3>
          <p><strong>Name:</strong> {childDetails.childName}</p>
          <p><strong>DOB:</strong> {childDetails.dateOfBirth}</p>
          <p><strong>Gender:</strong> {childDetails.gender}</p>
          <p><strong>Guardian:</strong> {childDetails.guardianName}</p>
          <p><strong>Contact:</strong> {childDetails.contact}</p>
          <p>
            <strong>Location:</strong> {childDetails.county}, {childDetails.subCounty}, {childDetails.ward}
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {vaccines.length > 0 && (
        <div style={{ width: "120px", margin: "0 auto 20px" }}>
          <CircularProgressbar
            value={progress}
            text={`${progress}%`}
            styles={buildStyles({
              textColor: "#2c3e50",
              pathColor: progress === 100 ? "green" : "#4CAF50",
              trailColor: "#ddd",
            })}
          />
          <p style={{ textAlign: "center", marginTop: "10px" }}>
            {completed}/{total} Vaccines Completed
          </p>
        </div>
      )}

      {/* Vaccine Table */}
      {vaccines.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#4CAF50", color: "white" }}>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Vaccine</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Dose</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Due Date</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "12px", border: "1px solid #ddd" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {vaccines.map((v) => (
              <React.Fragment key={v.docId}>
                <tr
                  onClick={() =>
                    setExpandedRow(expandedRow === v.docId ? null : v.docId)
                  }
                  style={{
                    cursor: "pointer",
                    background: expandedRow === v.docId ? "#f1f8e9" : "transparent",
                  }}
                >
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>{v.vaccine}</td>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>{v.doseLabel}</td>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>{v.dueDate}</td>
                  <td style={{ padding: "12px", border: "1px solid #ddd", ...statusStyle(v.status) }}>
                    {v.status}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                    {v.status === "Pending" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal(v.docId);
                        }}
                        style={{
                          background: "#4CAF50",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Mark as Given
                      </button>
                    )}
                  </td>
                </tr>

                {expandedRow === v.docId && (
                  <tr key={`${v.docId}-details`}>
                    <td
                      colSpan="5"
                      style={{
                        padding: "12px",
                        background: "#fafafa",
                        border: "1px solid #ddd",
                      }}
                    >
                      {v.dateGiven && <p><strong>Date Given:</strong> {v.dateGiven}</p>}
                      {v.batch && <p><strong>Batch No:</strong> {v.batch}</p>}
                      {v.healthWorker && <p><strong>Health Worker:</strong> {v.healthWorker}</p>}
                      {v.notes && <p><strong>Notes:</strong> {v.notes}</p>}
                      {v.updatedAt && <p><strong>Updated At:</strong> {v.updatedAt}</p>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "8px",
              width: "400px",
            }}
          >
            <h3>Enter Dose Details</h3>
            <input
              type="date"
              value={doseDetails.date}
              onChange={(e) =>
                setDoseDetails({ ...doseDetails, date: e.target.value })
              }
              style={{ margin: "8px 0", padding: "8px", width: "100%" }}
            />
            <input
              type="text"
              placeholder="Batch Number"
              value={doseDetails.batch}
              onChange={(e) =>
                setDoseDetails({ ...doseDetails, batch: e.target.value })
              }
              style={{ margin: "8px 0", padding: "8px", width: "100%" }}
            />
            <input
              type="text"
              placeholder="Health Worker Name/ID"
              value={doseDetails.healthWorker}
              onChange={(e) =>
                setDoseDetails({ ...doseDetails, healthWorker: e.target.value })
              }
              style={{ margin: "8px 0", padding: "8px", width: "100%" }}
            />
            <textarea
              placeholder="Notes"
              value={doseDetails.notes}
              onChange={(e) =>
                setDoseDetails({ ...doseDetails, notes: e.target.value })
              }
              style={{ margin: "8px 0", padding: "8px", width: "100%" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => confirmMarkAsGiven(confirmModal)}
                style={{
                  flex: 1,
                  background: "#4CAF50",
                  color: "#fff",
                  padding: "10px",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1,
                  background: "red",
                  color: "#fff",
                  padding: "10px",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-center" />
    </div>
  );
}