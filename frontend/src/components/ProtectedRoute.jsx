import { Navigate } from "react-router-dom";
import { useSyncLocalStorage } from "../hooks/useSyncLocalStorage";

/**
 * A reusable route guard that restricts access
 * based on the logged-in user's role and session status.
 */
export default function ProtectedRoute({ element, allowedRoles = [] }) {
  // ✅ Pull logged-in user and role from synced local storage
  const [loggedInUser] = useSyncLocalStorage("loggedInUser", null);
  const [userRole] = useSyncLocalStorage("userRole", null);

  // ⛔ Not logged in
  if (!loggedInUser || !userRole) {
    return <Navigate to="/" replace />;
  }

  // ⛔ Role not authorized
  if (!allowedRoles.includes(userRole)) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "100px auto",
          textAlign: "center",
          background: "#fff3cd",
          padding: "30px",
          borderRadius: "10px",
          color: "#856404",
        }}
      >
        <h2>🚫 Access Denied</h2>
        <p>Your account role (<strong>{userRole}</strong>) does not have permission to view this page.</p>
        <p>Contact your system administrator if you believe this is an error.</p>
      </div>
    );
  }

  // ✅ Access granted
  return element;
}