'use client';

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { firebaseApp } from "../../firebaseconfig";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, query, orderByChild, equalTo, get } from "firebase/database";
import { useRouter } from "next/navigation";

// Importing icons from react-icons
import { FaEnvelope, FaKey } from "react-icons/fa";

type LoginFormValues = {
  login: string; // can be email or phone number
  password: string;
};

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp);

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setLoading(true);
    let emailToUse = data.login;
    try {
      // If the login field doesn't contain '@', assume it's a phone number
      if (!data.login.includes("@")) {
        const usersRef = ref(database, "users");
        const phoneQuery = query(usersRef, orderByChild("phone"), equalTo(data.login));
        const snapshot = await get(phoneQuery);
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          // There should be only one user with this phone number
          const userKey = Object.keys(usersData)[0];
          emailToUse = usersData[userKey].email;
        } else {
          throw new Error("No user found with that phone number");
        }
      }
      // Sign in using the resolved email and password
      await signInWithEmailAndPassword(auth, emailToUse, data.password);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error.message);
      alert(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-200 to-blue-200 p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Login</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email or Phone Number */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-green-500 p-3">
              <FaEnvelope className="text-white" />
            </span>
            <input
              type="text"
              placeholder="Email or Phone Number"
              {...register("login", { required: "Email or phone is required" })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.login && <p className="text-red-500 text-sm">{errors.login.message}</p>}

          {/* Password */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-green-500 p-3">
              <FaKey className="text-white" />
            </span>
            <input
              type="password"
              placeholder="Password"
              {...register("password", { required: "Password is required" })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded transition duration-200"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
