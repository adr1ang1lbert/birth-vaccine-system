export default function Dashboard() {
  // ✅ Get role from localStorage
  const userRole = localStorage.getItem("userRole") || "chw";

  const adminCards = [
    { title: "User Management", link: "/user-management" },
    { title: "Analytics", link: "/analytics" },
    { title: "Reports", link: "/reports" },
    { title: "Settings", link: "/settings" },
    { title: "Help & Support", link: "/help-support" }, // ✅ added here
  ];

  const chwCards = [
    { title: "Register Child", link: "/register" },
    { title: "Vaccination Schedule", link: "/vaccination-schedule" },
    { title: "Vaccination Update", link: "/vaccination-update" },
    { title: "Notifications", link: "/notifications" },
    { title: "Help & Support", link: "/help-support" }, // ✅ added here
  ];

  const cards = userRole === "admin" ? adminCards : chwCards;

  return (
    <div style={{ padding: "20px", backgroundColor: "#f4f4f4", minHeight: "100vh" }}>
      <h1 style={{ color: "#4CAF50", textAlign: "center", marginBottom: "30px" }}>
        {userRole === "admin" ? "Administrator Dashboard" : "Community Health Worker Dashboard"}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        {cards.map((card, index) => (
          <div
            key={index}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onClick={() => (window.location.href = card.link)}
          >
            <h3 style={{ color: "#333" }}>{card.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
