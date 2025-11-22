import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BackButton from "../components/BackButton";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  getFirestore,
  collection,
  getDocs,
} from "firebase/firestore";
import app from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function ReportsPage() {
  const [children, setChildren] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoReports, setAutoReports] = useState(true);
  const [reportFormat, setReportFormat] = useState("PDF");

  const today = new Date().toISOString().split("T")[0];

  // ✅ Fetch children + vaccination schedules from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const childrenSnapshot = await getDocs(collection(db, "children"));
        const childrenData = childrenSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChildren(childrenData);

        const allSchedules = [];
        for (const child of childrenSnapshot.docs) {
          const scheduleRef = collection(db, `children/${child.id}/schedule`);
          const scheduleSnapshot = await getDocs(scheduleRef);
          scheduleSnapshot.forEach((v) => {
            allSchedules.push({ childId: child.id, ...v.data() });
          });
        }

        setSchedules(allSchedules);
      } catch (error) {
        console.error("Error fetching Firestore data:", error);
        toast.error("❌ Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Compute statistics
  const { given, pending, missed, dueThisMonth, monthlyCounts } = useMemo(() => {
    const stats = {
      given: 0,
      pending: 0,
      missed: 0,
      dueThisMonth: 0,
      monthlyCounts: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        children: 0,
      })),
    };

    const currentMonth = new Date().getMonth();

    schedules.forEach((v) => {
      const dueDate = v.dueDate;
      const isGiven = v.status?.includes("Given");
      const isMissed = !isGiven && dueDate < today;
      const isPending = !isGiven && dueDate >= today;

      if (isGiven) stats.given++;
      else if (isMissed) stats.missed++;
      else if (isPending) stats.pending++;

      if (!isGiven) {
        const due = new Date(v.dueDate);
        if (due.getMonth() === currentMonth) stats.dueThisMonth++;
      }
    });

    children.forEach((child) => {
      if (child.dateOfBirth) {
        const month = new Date(child.dateOfBirth).getMonth();
        if (stats.monthlyCounts[month]) stats.monthlyCounts[month].children++;
      }
    });

    return stats;
  }, [schedules, children, today]);

  const totalChildren = children.length;
  const COLORS = ["#4CAF50", "#FFC107", "#F44336"];
  const vaccinationData = [
    { name: "Given", value: given },
    { name: "Pending", value: pending },
    { name: "Missed", value: missed },
  ];

  // ✅ Handle report download
  const handleDownload = () => {
    if (!autoReports) {
      toast.warn("⚠️ Auto-report generation is disabled in Settings.");
      return;
    }

    const reportData = {
      generatedAt: new Date().toLocaleString(),
      totalChildren,
      given,
      pending,
      missed,
      dueThisMonth,
    };

    if (reportFormat === "PDF") generatePDF(reportData);
    else if (reportFormat === "CSV") generateCSV(reportData);
    else if (reportFormat === "Excel") generateExcel(reportData);
  };

  // ✅ Generate PDF
  const generatePDF = (data) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Vaccination Summary Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated on: ${data.generatedAt}`, 20, 30);
    doc.text(`Total Registered Children: ${data.totalChildren}`, 20, 45);
    doc.text(`Vaccines Given: ${data.given}`, 20, 55);
    doc.text(`Pending Vaccinations: ${data.pending}`, 20, 65);
    doc.text(`Missed Vaccinations: ${data.missed}`, 20, 75);
    doc.text(`Due This Month: ${data.dueThisMonth}`, 20, 85);
    doc.save("Vaccination_Report.pdf");
    toast.success("✅ PDF report downloaded!");
  };

  // ✅ Generate CSV
  const generateCSV = (data) => {
    const csv = `Metric,Value
Generated On,${data.generatedAt}
Total Registered Children,${data.totalChildren}
Vaccines Given,${data.given}
Pending Vaccinations,${data.pending}
Missed Vaccinations,${data.missed}
Due This Month,${data.dueThisMonth}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Vaccination_Report.csv");
    toast.success("✅ CSV report downloaded!");
  };

  // ✅ Generate Excel
  const generateExcel = (data) => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Metric: "Generated On", Value: data.generatedAt },
      { Metric: "Total Registered Children", Value: data.totalChildren },
      { Metric: "Vaccines Given", Value: data.given },
      { Metric: "Pending Vaccinations", Value: data.pending },
      { Metric: "Missed Vaccinations", Value: data.missed },
      { Metric: "Due This Month", Value: data.dueThisMonth },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "Vaccination_Report.xlsx");
    toast.success("✅ Excel report downloaded!");
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "auto",
        padding: "30px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        minHeight: "100vh",
      }}
    >
      <BackButton />
      <h2 style={{ textAlign: "center", color: "#222", marginBottom: "20px" }}>
        📊 Vaccination Reports & Analytics
      </h2>

      {/* 🔧 Settings Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        {/* Toggle Auto Reports */}
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={autoReports}
            onChange={(e) => {
              setAutoReports(e.target.checked);
              toast.info(
                e.target.checked
                  ? "✅ Automatic report generation enabled."
                  : "⚠️ Automatic report generation disabled."
              );
            }}
          />
          Enable Auto-Reports
        </label>

        {/* Report Format Selector */}
        <select
          value={reportFormat}
          onChange={(e) => setReportFormat(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontWeight: "bold",
          }}
        >
          <option value="PDF">📄 PDF</option>
          <option value="CSV">📊 CSV</option>
          <option value="Excel">📘 Excel</option>
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: "center" }}>Loading data...</p>
      ) : (
        <>
          {/* Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            <StatCard title="Total Registered Children" value={totalChildren} color="#4CAF50" />
            <StatCard title="Vaccinations Due This Month" value={dueThisMonth} color="#FFC107" />
            <StatCard title="Missed Vaccinations" value={missed} color="#F44336" />
          </div>

          {/* Charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
            }}
          >
            {/* Pie Chart */}
            <div
              style={{
                height: "350px",
                background: "#fff",
                borderRadius: "10px",
                padding: "20px",
                border: "1px solid #ddd",
              }}
            >
              <h3 style={{ textAlign: "center", color: "#222", marginBottom: "15px" }}>
                Vaccination Status
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vaccinationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {vaccinationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div
              style={{
                height: "350px",
                background: "#fff",
                borderRadius: "10px",
                padding: "20px",
                border: "1px solid #ddd",
              }}
            >
              <h3 style={{ textAlign: "center", color: "#222", marginBottom: "15px" }}>
                Child Registrations Over Months
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCounts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#333" />
                  <YAxis stroke="#333" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="children" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Download Button */}
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <button
              onClick={handleDownload}
              style={{
                background: "#2196F3",
                color: "white",
                padding: "12px 20px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ⬇️ Download {reportFormat} Report
            </button>
          </div>
        </>
      )}

      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}

// ✅ Reusable Stats Card
function StatCard({ title, value, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h3 style={{ color: "#333" }}>{title}</h3>
      <p style={{ fontSize: "22px", fontWeight: "bold", color }}>{value}</p>
    </div>
  );
}