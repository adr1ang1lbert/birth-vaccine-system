// Import Firebase core and services
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqm-wrlGxytGE9l6mpYks_vzpNxKswVj8",
  authDomain: "vaccination-system-61199.firebaseapp.com",
  projectId: "vaccination-system-61199",
  storageBucket: "vaccination-system-61199.firebasestorage.app",
  messagingSenderId: "1013190389937",
  appId: "1:1013190389937:web:9332946867d8ae3c4cb290"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Authentication and Firestore Database
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;