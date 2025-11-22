// frontend/src/pages/VaccinationSchedule.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { QRCodeCanvas } from "qrcode.react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import app from "../firebase/firebaseConfig";

// ✅ Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const db = getFirestore(app);

export default function VaccinationSchedule() {
  const [searchId, setSearchId] = useState("");
  const [childDetails, setChildDetails] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔍 Fetch child and vaccine data from Firestore
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    try {
      setLoading(true);
      const childRef = doc(db, "children", searchId.trim());
      const childSnap = await getDoc(childRef);

      if (childSnap.exists()) {
        const data = childSnap.data();
        setChildDetails(data);

        // Get schedule subcollection
        const scheduleRef = collection(db, `children/${searchId.trim()}/schedule`);
        const snapshot = await getDocs(scheduleRef);
        const schedule = snapshot.docs.map((doc) => doc.data());
        setVaccines(schedule);
      } else {
        setChildDetails(null);
        setVaccines([]);
        alert("No record found for that ID.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error retrieving vaccination schedule.");
    } finally {
      setLoading(false);
    }
  };

  // 🧮 Progress
  const completed = vaccines.filter((v) => v.status?.includes("Given")).length;
  const missed = vaccines.filter((v) => v.status?.includes("Missed")).length;
  const pending = vaccines.filter((v) => v.status?.includes("Pending")).length;
  const progress = vaccines.length
    ? Math.round((completed / vaccines.length) * 100)
    : 0;

  // ℹ️ Vaccine Info
  const vaccineInfo = {
    BCG: {
      description: "Protects against tuberculosis (TB).",
      nextStep: "Given once at birth or soon after.",
    },
    OPV: {
      description: "Oral Polio Vaccine prevents poliomyelitis.",
      nextStep: "Given at birth, 6, 10, 14 weeks, and booster at 18 months.",
    },
    "Pentavalent (DTP-HepB-Hib)": {
      description:
        "Protects against diphtheria, pertussis, tetanus, hepatitis B, and Hib.",
      nextStep: "Three doses at 6, 10, and 14 weeks.",
    },
    PCV: {
      description: "Protects against pneumonia and meningitis.",
      nextStep: "Three doses at 6, 10, and 14 weeks.",
    },
    Rotavirus: {
      description: "Protects against severe diarrhea.",
      nextStep: "Two doses at 6 and 10 weeks.",
    },
    "Measles-Rubella (MR)": {
      description: "Protects against measles and rubella.",
      nextStep: "Dose 1 at 9 months, Dose 2 at 18 months.",
    },
    "Yellow Fever": {
      description: "Protects against yellow fever.",
      nextStep: "Single dose at 9 months.",
    },
  };

  // 🎨 Status Styling
  const statusStyle = (status) => {
    if (status?.includes("Pending")) return { color: "#ff9800", fontWeight: "600" };
    if (status?.includes("Given")) return { color: "#4caf50", fontWeight: "600" };
    if (status?.includes("Missed")) return { color: "#f44336", fontWeight: "600" };
    return { color: "#000" };
  };

  // 📥 PDF Export
  const downloadPDF = () => {
    if (!childDetails) return;
    const docPDF = new jsPDF();
    docPDF.setFontSize(16);
    docPDF.text("Vaccination Card", 14, 20);

    docPDF.setFontSize(12);
    docPDF.text(`Child ID: ${childDetails.childId}`, 14, 35);
    docPDF.text(`Name: ${childDetails.childName}`, 14, 42);
    docPDF.text(`DOB: ${childDetails.dateOfBirth}`, 14, 49);
    docPDF.text(`Guardian: ${childDetails.guardianName}`, 14, 56);
    docPDF.text(`Contact: ${childDetails.contact}`, 14, 63);
    docPDF.text(
      `Location: ${childDetails.county}, ${childDetails.subCounty}, ${childDetails.ward}`,
      14,
      70
    );

    const tableColumn = ["Vaccine", "Dose", "Due Date", "Status"];
    const tableRows = vaccines.map((v) => [
      v.vaccine,
      v.doseLabel,
      v.dueDate,
      v.status,
    ]);

    docPDF.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [76, 175, 80] },
    });

    docPDF.save(`Vaccination_Card_${childDetails.childId}.pdf`);
  };

  // 🎨 UI Styles
  const container = {
    maxWidth: "900px",
    margin: "40px auto",
    padding: "30px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
  };

  const searchInput = {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  };

  const button = (bg) => ({
    background: bg,
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
  });

  return (
    <div style={container}>
      <BackButton />
      <h2 style={{ textAlign: "center", color: "#2c3e50", marginBottom: 20 }}>
        🩺 Vaccination Schedule
      </h2>

      {/* 🔍 Search */}
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
        }}
      >
        <input
          type="text"
          placeholder="Enter Child ID (e.g., VAC-KE-...)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={searchInput}
        />
        <button type="submit" style={button("#4CAF50")}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* 🧒 Child Info */}
      {childDetails && (
        <div
          style={{
            padding: "15px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#f9f9f9",
            marginBottom: "25px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ color: "#1b5e20" }}>👶 Child Information</h3>
            <p><strong>ID:</strong> {childDetails.childId}</p>
            <p><strong>Name:</strong> {childDetails.childName}</p>
            <p><strong>DOB:</strong> {childDetails.dateOfBirth}</p>
            <p><strong>Guardian:</strong> {childDetails.guardianName}</p>
            <p><strong>Contact:</strong> {childDetails.contact}</p>
            <p>
              <strong>Location:</strong> {childDetails.county}, {childDetails.subCounty},{" "}
              {childDetails.ward}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <QRCodeCanvas value={childDetails.childId} size={110} />
            <p style={{ fontSize: 12, color: "#555" }}>Scan for record</p>
          </div>
        </div>
      )}

      {/* 📊 Progress */}
      {vaccines.length > 0 && (
        <div style={{ textAlign: "center", marginBottom: 25 }}>
          <div style={{ width: "120px", margin: "auto" }}>
            <CircularProgressbar
              value={progress}
              text={`${progress}%`}
              styles={buildStyles({
                pathColor: progress === 100 ? "#388e3c" : "#4caf50",
                textColor: "#333",
                trailColor: "#eee",
              })}
            />
          </div>
          <p style={{ marginTop: 10 }}>
            ✅ {completed} Given | 🟠 {pending} Pending | ❌ {missed} Missed
          </p>
        </div>
      )}

      {/* 💉 Vaccine Table */}
      {vaccines.length > 0 ? (
        <div style={{ overflowX: "auto", maxHeight: "400px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#4CAF50", color: "#fff" }}>
                {["Vaccine", "Dose", "Due Date", "Status"].map((head) => (
                  <th
                    key={head}
                    style={{
                      padding: "12px",
                      border: "1px solid #ddd",
                      position: "sticky",
                      top: 0,
                      background: "#4CAF50",
                    }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vaccines.map((v) => (
                <>
                  <tr
                    key={v.id}
                    onClick={() =>
                      setExpandedRow(expandedRow === v.id ? null : v.id)
                    }
                    style={{
                      cursor: "pointer",
                      background:
                        expandedRow === v.id ? "#f1f8e9" : "transparent",
                    }}
                  >
                    <td style={{ padding: 12, border: "1px solid #ddd" }}>
                      {v.vaccine}
                    </td>
                    <td style={{ padding: 12, border: "1px solid #ddd" }}>
                      {v.doseLabel}
                    </td>
                    <td style={{ padding: 12, border: "1px solid #ddd" }}>
                      {v.dueDate}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        border: "1px solid #ddd",
                        ...statusStyle(v.status),
                      }}
                    >
                      {v.status}
                    </td>
                  </tr>
                  {expandedRow === v.id && (
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          padding: "12px",
                          background: "#fafafa",
                          border: "1px solid #ddd",
                        }}
                      >
                        <p>
                          <strong>Description:</strong>{" "}
                          {vaccineInfo[v.vaccine]?.description || "N/A"}
                        </p>
                        <p>
                          <strong>Guidelines:</strong>{" "}
                          {vaccineInfo[v.vaccine]?.nextStep ||
                            "Follow Ministry of Health schedule."}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#999" }}>
          {searchId
            ? "No schedule found for this ID."
            : "Search for a child to view schedule."}
        </p>
      )}

      {/* 📥 Actions */}
      {childDetails && (
        <div style={{ marginTop: 25 }}>
          <button onClick={downloadPDF} style={button("#673AB7")}>
            📄 Download Vaccination Card (PDF)
          </button>
          <button
            onClick={() => navigate("/vaccination-update")}
            style={{ ...button("#2196F3"), marginTop: 10, width: "100%" }}
          >
            Go to Vaccination Update
          </button>
        </div>
      )}
    </div>
  );
}