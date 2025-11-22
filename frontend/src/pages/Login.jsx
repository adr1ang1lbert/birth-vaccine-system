import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import app from "../firebase/firebaseConfig";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
export default function Login() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // ✅ 1. Sign in user
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      // ✅ 2. Fetch Firestore user details
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        toast.error("❌ User not found in database.");
        setIsLoading(false);
        return;
      }
      const userData = userSnap.data();
      // ✅ 3. Check account status
      if (userData.status === "Pending Approval") {
        toast.warn("⚠️ Your account is still pending admin approval.");
        setIsLoading(false);
        return;
      }
      if (userData.status === "Inactive") {
        toast.error("🚫 Your account has been deactivated. Contact an admin.");
        setIsLoading(false);
        return;
      }
      // ✅ 4. Save role locally
      localStorage.setItem("userRole", userData.role);
      toast.success(`✅ Welcome back, ${userData.name}!`);
      // ✅ 5. Redirect based on role
      setTimeout(() => {
        if (userData.role === "Admin") {
          navigate("/admin-dashboard");
        } else if (userData.role === "CHW") {
          navigate("/chw-dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 1200);
    } catch (error) {
      console.error(error);
      toast.error("❌ Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "100px auto",
        padding: "25px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#4CAF50" }}>🔐 Login</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <label>
          Email:
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            background: isLoading ? "#ccc" : "#4CAF50",
            color: "white",
            padding: "12px",
            border: "none",
            borderRadius: "5px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {isLoading ? "⏳ Logging In..." : "Log In"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: "10px", color: "#666" }}>
        Don’t have an account? Register first with your admin’s approval.
      </p>
      <ToastContainer position="bottom-center" autoClose={2500} />
    </div>
  );
}
