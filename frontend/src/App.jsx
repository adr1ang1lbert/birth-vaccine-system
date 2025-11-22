import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import RegistrationForm from "./pages/RegistrationForm";
import ReportsPage from "./pages/ReportsPage";
import Login from "./pages/Login";
import UserRegistration from "./pages/UserRegistration";
import VaccinationSchedule from "./pages/VaccinationSchedule";
import ChildProfile from "./pages/ChildProfile";
import VaccinationUpdate from "./pages/VaccinationUpdate";
import Notifications from "./pages/Notifications";
import UserManagement from "./pages/UserManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";

function Navbar() {
  const userRole = localStorage.getItem("userRole") || null;
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Hide navbar if on Login page
  if (location.pathname === "/") {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("userRole"); // clear login session
    navigate("/"); // redirect to login
  };

  return (
    <nav style={{ padding: "10px", background: "#eee" }}>
      <Link to="/dashboard" style={{ marginRight: "10px" }}>Dashboard</Link>
      <Link to="/register" style={{ marginRight: "10px" }}>Registration</Link>
      <Link to="/reports" style={{ marginRight: "10px" }}>Reports</Link>
      <Link to="/user-registration" style={{ marginRight: "10px" }}>User Registration</Link>

      {userRole === "admin" && (
        <>
          <Link to="/user-management" style={{ marginRight: "10px" }}>User Management</Link>
          <Link to="/analytics" style={{ marginRight: "10px" }}>Analytics</Link>
          <Link to="/settings" style={{ marginRight: "10px" }}>Settings</Link>
        </>
      )}

      <Link to="/vaccination-schedule" style={{ marginRight: "10px" }}>Vaccination Schedule</Link>
      <Link to="/child-profile" style={{ marginRight: "10px" }}>Child Profile</Link>
      <Link to="/vaccination-update" style={{ marginRight: "10px" }}>Vaccination Update</Link>
      <Link to="/notifications" style={{ marginRight: "10px" }}>Notifications</Link>
      <Link to="/help-support" style={{ marginRight: "10px" }}>Help & Support</Link>

      {userRole && (
        <button
          onClick={handleLogout}
          style={{
            marginLeft: "20px",
            padding: "6px 12px",
            background: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/user-registration" element={<UserRegistration />} />

        {localStorage.getItem("userRole") === "admin" && (
          <>
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/settings" element={<Settings />} />
          </>
        )}

        <Route path="/vaccination-schedule" element={<VaccinationSchedule />} />
        <Route path="/child-profile" element={<ChildProfile />} />
        <Route path="/vaccination-update" element={<VaccinationUpdate />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/help-support" element={<HelpSupport />} />
      </Routes>
    </Router>
  );
}

export default App;