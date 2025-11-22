import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BackButton from "../components/BackButton";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import app from "../firebase/firebaseConfig";

// ✅ Export libraries
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const db = getFirestore(app);

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("monthly");
  const [children, setChildren] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoReports, setAutoReports] = useState(true);
  const [defaultReportFormat, setDefaultReportFormat] = useState("PDF");

  // ✅ Fetch Firestore Data (depends on timeRange)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const childrenSnap = await getDocs(collection(db, "children"));
        const childrenData = childrenSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChildren(childrenData);

        // Fetch vaccination schedules
        const allSchedules = {};
        for (const child of childrenData) {
          const scheduleSnap = await getDocs(
            collection(db, `children/${child.id}/schedule`)
          );
          allSchedules[child.id] = scheduleSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
        setSchedules(allSchedules);
      } catch (error) {
        console.error("Error fetching Firestore data:", error);
        toast.error("⚠️ Failed to fetch data from Firestore.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]); // ✅ Added dependency so chart updates when time range changes

  // ✅ Summary statistics
  const totalChildren = children.length;
  let given = 0,
    pending = 0,
    missed = 0;

  Object.values(schedules).forEach((childVaccines) => {
    childVaccines.forEach((v) => {
      if (v.status?.includes("Given")) given++;
      else if (v.status?.includes("Missed")) missed++;
      else pending++;
    });
  });

  // ✅ Memoized Trends — changes when timeRange or schedules change
  const vaccinationTrends = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString("default", { month: "short" })
    );

    const trends = months.map((month) => {
      let givenCount = 0,
        pendingCount = 0,
        missedCount = 0;

      Object.values(schedules).forEach((childVaccines) => {
        childVaccines.forEach((v) => {
          if (!v.dueDate) return;
          const due = new Date(v.dueDate);
          const dueMonth = due.toLocaleString("default", { month: "short" });

          // Filter based on selected time range
          if (
            (timeRange === "monthly" && dueMonth === month) ||
            (timeRange === "quarterly" &&
              ["Jan", "Feb", "Mar"].includes(month) &&
              ["Jan", "Feb", "Mar"].includes(dueMonth)) ||
            (timeRange === "yearly")
          ) {
            if (v.status?.includes("Given")) givenCount++;
            else if (v.status?.includes("Missed")) missedCount++;
            else pendingCount++;
          }
        });
      });

      return { month, given: givenCount, pending: pendingCount, missed: missedCount };
    });

    return trends;
  }, [schedules, timeRange]);

  // ✅ CHW performance
  const chwCounts = {};
  Object.values(schedules).forEach((childVaccines) => {
    childVaccines.forEach((v) => {
      if (v.status?.includes("Given") && v.healthWorker) {
        const chw = v.healthWorker.trim();
        chwCounts[chw] = (chwCounts[chw] || 0) + 1;
      }
    });
  });

  const chwData =
    Object.keys(chwCounts).length > 0
      ? Object.entries(chwCounts).map(([chw, vaccinations]) => ({
          chw,
          vaccinations,
        }))
      : [{ chw: "No CHW data available", vaccinations: 0 }];

  // ✅ Export handlers
  const handleExport = (type) => {
    if (!autoReports) {
      toast.warn("⚠️ Auto-report generation is disabled in Settings.");
      return;
    }

    switch (type) {
      case "PDF":
        exportPDF();
        break;
      case "Excel":
        exportExcel();
        break;
      case "CSV":
        exportCSV();
        break;
      default:
        toast.error("❌ Unknown export format");
    }
  };

  // ✅ PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Vaccination Analytics Report", 70, 15);

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 25);

    doc.text("Summary Statistics", 15, 35);
    doc.autoTable({
      startY: 40,
      head: [["Metric", "Count"]],
      body: [
        ["Total Registered Children", totalChildren],
        ["Vaccinations Given", given],
        ["Pending Vaccinations", pending],
        ["Missed Vaccinations", missed],
      ],
    });

    doc.text("CHW Performance", 15, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      head: [["CHW Name", "Vaccinations Given"]],
      body: chwData.map((d) => [d.chw, d.vaccinations]),
    });

    doc.text("Vaccination Trends", 15, doc.lastAutoTable.finalY + 10);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 15,
      head: [["Month", "Given", "Pending", "Missed"]],
      body: vaccinationTrends.map((t) => [t.month, t.given, t.pending, t.missed]),
    });

    doc.save("Vaccination_Analytics_Report.pdf");
    toast.success("📄 PDF exported successfully!");
  };

  // ✅ Excel Export
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Metric", "Count"],
      ["Total Registered Children", totalChildren],
      ["Vaccinations Given", given],
      ["Pending Vaccinations", pending],
      ["Missed Vaccinations", missed],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const chwSheet = XLSX.utils.json_to_sheet(chwData);
    XLSX.utils.book_append_sheet(wb, chwSheet, "CHW Performance");

    const trendSheet = XLSX.utils.json_to_sheet(vaccinationTrends);
    XLSX.utils.book_append_sheet(wb, trendSheet, "Trends");

    XLSX.writeFile(wb, "Vaccination_Analytics_Report.xlsx");
    toast.success("📊 Excel exported successfully!");
  };

  // ✅ CSV Export
  const exportCSV = () => {
    const csvRows = [
      "Metric,Count",
      `Total Registered Children,${totalChildren}`,
      `Vaccinations Given,${given}`,
      `Pending Vaccinations,${pending}`,
      `Missed Vaccinations,${missed}`,
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Vaccination_Analytics_Report.csv";
    a.click();
    toast.success("⬇️ CSV exported successfully!");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px", fontSize: "18px" }}>
        ⏳ Loading analytics from Firestore...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "auto",
        padding: "30px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.15)",
      }}
    >
      <BackButton />
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        📈 Analytics & Reports Dashboard
      </h2>

      {/* 🔧 Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <label>
            <input
              type="checkbox"
              checked={autoReports}
              onChange={() => setAutoReports(!autoReports)}
              style={{ marginRight: "8px" }}
            />
            Enable Auto Reports
          </label>
        </div>

        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>Format:</label>
          <select
            value={defaultReportFormat}
            onChange={(e) => setDefaultReportFormat(e.target.value)}
            style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
          >
            <option value="PDF">PDF</option>
            <option value="Excel">Excel</option>
            <option value="CSV">CSV</option>
          </select>

          <label style={{ marginLeft: "20px", marginRight: "10px", fontWeight: "bold" }}>
            Time Range:
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {/* 📊 Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <StatCard title="Total Registered Children" value={totalChildren} color="#4CAF50" />
        <StatCard title="Vaccinations Given" value={given} color="#2196F3" />
        <StatCard title="Pending Vaccinations" value={pending} color="#FFC107" />
        <StatCard title="Missed Vaccinations" value={missed} color="#F44336" />
      </div>

      {/* 📈 Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          marginBottom: "30px",
        }}
      >
        <ChartCard title="Vaccination Trends" data={vaccinationTrends} />
        <CHWChartCard title="CHW Performance" data={chwData} />
      </div>

      {/* 📤 Export Buttons */}
      <div style={{ textAlign: "center" }}>
        <button onClick={() => handleExport("CSV")} style={btnStyle("#4CAF50", "white")}>
          ⬇️ Export CSV
        </button>
        <button onClick={() => handleExport("PDF")} style={btnStyle("#2196F3", "white")}>
          📄 Export PDF
        </button>
        <button onClick={() => handleExport("Excel")} style={btnStyle("#FFC107", "#222")}>
          📊 Export Excel
        </button>
      </div>

      <ToastContainer position="bottom-right" autoClose={2000} />
    </div>
  );
}

// ✅ Helper components
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

function ChartCard({ title, data }) {
  return (
    <div
      style={{
        height: "350px",
        background: "#fafafa",
        borderRadius: "10px",
        padding: "20px",
        border: "1px solid #ddd",
      }}
    >
      <h3 style={{ textAlign: "center", marginBottom: "15px" }}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" stroke="#222" />
          <YAxis stroke="#222" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="given" stroke="#4CAF50" />
          <Line type="monotone" dataKey="pending" stroke="#FFC107" />
          <Line type="monotone" dataKey="missed" stroke="#F44336" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CHWChartCard({ title, data }) {
  return (
    <div
      style={{
        height: "350px",
        background: "#fafafa",
        borderRadius: "10px",
        padding: "20px",
        border: "1px solid #ddd",
      }}
    >
      <h3 style={{ textAlign: "center", marginBottom: "15px" }}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="chw" stroke="#222" />
          <YAxis stroke="#222" />
          <Tooltip />
          <Legend />
          <Bar dataKey="vaccinations" fill="#2196F3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    margin: "10px",
    background: bg,
    color,
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };
}