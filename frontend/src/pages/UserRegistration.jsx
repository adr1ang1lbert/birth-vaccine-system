import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import app from "../firebase/firebaseConfig";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper function to check password strength
const isStrongPassword = (password) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*]/.test(password)
  );
};

export default function UserRegistration() {
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "CHW",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isStrongPassword(formData.password)) {
      toast.error("⚠️ Weak password. Use 8+ chars, uppercase, lowercase, number, and symbol.");
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ 1. Create Firebase Authentication user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // ✅ 2. Save user details to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: "Pending Approval",
        createdAt: new Date().toISOString(),
      });

      toast.success("✅ Registration successful! Awaiting admin approval.");
      setFormData({ name: "", email: "", role: "CHW", password: "" });
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "❌ Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "auto",
        padding: "20px",
        background: "#ffffff",
        color: "#222",
        borderRadius: "12px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#111" }}>
        📝 User Registration
      </h2>

      <p style={{ textAlign: "center", color: "#666", marginBottom: "20px" }}>
        Register to access the Vaccination System. Your account will be reviewed
        and approved by an Admin before activation.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="CHW">Community Health Worker (CHW)</option>
          <option value="Admin">Administrator</option>
        </select>

        <input
          type="password"
          name="password"
          placeholder="Create Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: isSubmitting ? "#ccc" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "12px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {isSubmitting ? "⏳ Registering..." : "🚀 Register"}
        </button>
      </form>

      <ToastContainer position="bottom-center" autoClose={2500} />
    </div>
  );
}