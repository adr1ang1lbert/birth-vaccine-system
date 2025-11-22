import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function ChildProfile() {
  const [searchId, setSearchId] = useState("");
  const [childData, setChildData] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  // ✅ Search child in Firestore by ID, Name, or Birth Certificate
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setChildData(null);
    setVaccines([]);

    const input = searchId.trim().toLowerCase();
    try {
      // 1️⃣ Try to find child by document ID
      const docRef = doc(db, "children", input);
      const docSnap = await getDoc(docRef);

      let foundChild = null;
      if (docSnap.exists()) {
        foundChild = { id: docSnap.id, ...docSnap.data() };
      } else {
        // 2️⃣ If not found, search by childName or birthCertificate
        const childrenRef = collection(db, "children");
        const q1 = query(childrenRef, where("childNameLower", "==", input));
        const q2 = query(childrenRef, where("birthCertificate", "==", input));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const combined = [...snap1.docs, ...snap2.docs];

        if (combined.length > 0) {
          const childDoc = combined[0];
          foundChild = { id: childDoc.id, ...childDoc.data() };
        }
      }

      if (foundChild) {
        setChildData(foundChild);

        // 3️⃣ Fetch vaccination schedule
        const scheduleRef = collection(db, `children/${foundChild.id}/schedule`);
        const scheduleSnap = await getDocs(scheduleRef);
        const scheduleData = scheduleSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVaccines(scheduleData);
      } else {
        toast.error("❌ Child not found. Check the name or birth certificate number.");
      }
    } catch (error) {
      console.error("Error fetching child data:", error);
      toast.error("⚠️ Error searching for child. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Vaccination progress
  const completed = vaccines.filter((v) => v.status?.includes("Given")).length;
  const total = vaccines.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusStyle = (status) => {
    if (status?.includes("Pending")) return { color: "orange", fontWeight: "bold" };
    if (status?.includes("Given")) return { color: "green", fontWeight: "bold" };
    if (status?.includes("Missed")) return { color: "red", fontWeight: "bold" };
    return { color: "#000" };
  };

  const inputStyle = {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginRight: "10px",
    flex: 1,
    outline: "none",
    fontSize: "15px",
  };

  // ✅ Export child report to PDF
  const handleDownloadPDF = async () => {
    if (!childData) return;
    const input = reportRef.current;

    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);

    pdf.save(`${childData.childName}_Vaccination_Report.pdf`);
    toast.success("📄 Child vaccination report downloaded!");
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "auto",
        padding: "25px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#1b5e20" }}>Child Profile</h2>
      <p style={{ textAlign: "center", color: "#555", marginBottom: "20px" }}>
        Search by name, document ID, or birth certificate number
      </p>

      {/* 🔍 Search Form */}
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", justifyContent: "center", marginBottom: "25px" }}
      >
        <input
          type="text"
          placeholder="Enter Child Name, ID, or Birth Certificate No."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={inputStyle}
          required
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#4CAF50",
            color: "white",
            padding: "12px 22px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* 📄 Report Section */}
      {childData ? (
        <div ref={reportRef}>
          {/* Child Info */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "flex-start",
              border: "1px solid #eee",
              borderRadius: "10px",
              padding: "20px",
              background: "#fafafa",
            }}
          >
            <div style={{ flex: "0 0 150px", textAlign: "center" }}>
              {childData.photo ? (
                <img
                  src={childData.photo}
                  alt="Child"
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: "10px",
                    objectFit: "cover",
                    marginBottom: "10px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: "10px",
                    background: "#eee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    color: "#777",
                    marginBottom: "10px",
                  }}
                >
                  No Photo
                </div>
              )}
              <QRCodeCanvas
                value={childData.birthCertificate || childData.childId || childData.id}
                size={110}
              />
              <p style={{ fontSize: "12px", color: "#555", marginTop: "5px" }}>
                Scan for Child ID
              </p>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ color: "#2c3e50", marginBottom: "10px" }}>
                👶 Child Information
              </h3>
              <p><b>Name:</b> {childData.childName}</p>
              <p><b>Birth Certificate:</b> {childData.birthCertificate || childData.id}</p>
              <p><b>Date of Birth:</b> {childData.dateOfBirth}</p>
              <p><b>Gender:</b> {childData.gender}</p>
              <p><b>Guardian:</b> {childData.guardianName} ({childData.relationship})</p>
              <p><b>Contact:</b> {childData.contact}</p>
              <p><b>Email:</b> {childData.guardianEmail || "N/A"}</p>
              <p><b>Location:</b> {childData.county}, {childData.subCounty}, {childData.ward}</p>
            </div>
          </div>

          {/* Progress */}
          {vaccines.length > 0 && (
            <div style={{ width: "130px", margin: "25px auto" }}>
              <CircularProgressbar
                value={progress}
                text={`${progress}%`}
                styles={buildStyles({
                  pathColor: progress === 100 ? "green" : "#4CAF50",
                  textColor: "#333",
                  trailColor: "#ddd",
                })}
              />
              <p style={{ textAlign: "center", marginTop: "10px" }}>
                {completed}/{total} Vaccines Completed
              </p>
            </div>
          )}

          {/* Vaccination Schedule */}
          <h3 style={{ color: "#2c3e50", marginTop: "25px" }}>💉 Vaccination Schedule</h3>
          {vaccines.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "10px",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#4CAF50", color: "white" }}>
                  <th style={{ padding: "10px", border: "1px solid #ddd" }}>Vaccine</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd" }}>Dose</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd" }}>Due Date</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {vaccines.map((v) => (
                  <>
                    <tr
                      key={v.id}
                      onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                      style={{
                        cursor: "pointer",
                        background: expandedRow === v.id ? "#f1f8e9" : "transparent",
                      }}
                    >
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{v.vaccine}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{v.doseLabel}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd" }}>{v.dueDate}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", ...statusStyle(v.status) }}>
                        {v.status}
                      </td>
                    </tr>

                    {expandedRow === v.id && (
                      <tr>
                        <td colSpan="4" style={{ padding: "10px", background: "#fafafa" }}>
                          {v.dateGiven && <p><b>Date Given:</b> {v.dateGiven}</p>}
                          {v.batch && <p><b>Batch No:</b> {v.batch}</p>}
                          {v.healthWorker && <p><b>Health Worker:</b> {v.healthWorker}</p>}
                          {v.notes && <p><b>Notes:</b> {v.notes}</p>}
                          {v.updatedAt && <p><b>Updated At:</b> {v.updatedAt}</p>}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: "center", marginTop: "15px", color: "#999" }}>
              No vaccination data available for this child.
            </p>
          )}
        </div>
      ) : (
        !loading && (
          <p style={{ textAlign: "center", color: "#999" }}>
            Search for a child to view their profile.
          </p>
        )
      )}

      {/* 📥 Download Button */}
      {childData && (
        <div style={{ textAlign: "center", marginTop: "25px" }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              background: "#1b5e20",
              color: "white",
              padding: "12px 25px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
            }}
          >
            📄 Download Child Report (PDF)
          </button>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}