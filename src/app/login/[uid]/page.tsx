'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { firebaseApp } from "../../../firebaseconfig";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

const PasswordLoginPage = () => {
  const router = useRouter();
  // Extract UID from the URL (e.g. /login/xAx0LTOsZOOPSMiSPEqCBn7YWhQ2)
  const { uid } = useParams();
  
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  
  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp);

  // On mount, retrieve the user's email using the UID
  useEffect(() => {
    if (!uid) return;
    const userRef = ref(database, `users/${uid}`);
    get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setEmail(data.email);
        } else {
          console.error("User not found");
          alert("User not found");
        }
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
        alert("Error fetching user data");
      });
  }, [uid, database]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email) throw new Error("User email not found");
      // Sign in with the retrieved email and the entered password
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error.message);
      alert(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-200 p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Password Login</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md transition duration-200"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordLoginPage;
