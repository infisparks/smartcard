'use client';

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { firebaseApp } from "../../firebaseconfig";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { useRouter } from "next/navigation";

// Importing icons from react-icons
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaKey,
  FaBirthdayCake,
  FaTint,
  FaWeight,
  FaRulerVertical,
  FaVenusMars,
} from "react-icons/fa";

type FormValues = {
  name: string;
  phone: string;
  age: number;
  email: string;
  password: string;
  bloodGroup?: string;
  weight?: number;
  height?: number;
  gender?: string;
};

const RegisterPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    try {
      // Create the user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      if (userCredential.user) {
        // Update the user profile with the display name
        await updateProfile(userCredential.user, { displayName: data.name });
        
        // Save additional info to Firebase Realtime Database
        // WARNING: NEVER save raw passwords in production!
        await set(ref(database, "users/" + userCredential.user.uid), {
          name: data.name,
          phone: data.phone,
          age: data.age,
          email: data.email,
          password: data.password,
          bloodGroup: data.bloodGroup || "",
          weight: data.weight || "",
          height: data.height || "",
          gender: data.gender || "",
        });
        
        // Redirect to dashboard page after successful registration
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Registration error:", error.message);
      // Optionally display error message to the user
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-200 p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Register</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaUser className="text-white" />
            </span>
            <input
              type="text"
              placeholder="Full Name"
              {...register("name", { required: "Name is required" })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}

          {/* Phone Number */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaPhone className="text-white" />
            </span>
            <input
              type="text"
              placeholder="Phone Number"
              {...register("phone", {
                required: "Phone number is required",
                pattern: {
                  value: /^\d{10}$/,
                  message: "Phone number must be exactly 10 digits",
                },
              })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}

          {/* Age */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaBirthdayCake className="text-white" />
            </span>
            <input
              type="number"
              placeholder="Age"
              {...register("age", { required: "Age is required", min: { value: 1, message: "Invalid age" } })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.age && <p className="text-red-500 text-sm">{errors.age.message}</p>}

          {/* Blood Group (Optional) */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaTint className="text-white" />
            </span>
            <select {...register("bloodGroup")} className="w-full p-3 outline-none">
              <option value="">Select Blood Group (Optional)</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          {/* Weight (Optional) */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaWeight className="text-white" />
            </span>
            <input
              type="number"
              placeholder="Weight (kg) - Optional"
              {...register("weight")}
              className="w-full p-3 outline-none"
            />
          </div>

          {/* Height (Optional) */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaRulerVertical className="text-white" />
            </span>
            <input
              type="number"
              placeholder="Height (cm) - Optional"
              {...register("height")}
              className="w-full p-3 outline-none"
            />
          </div>

          {/* Gender (Optional) */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaVenusMars className="text-white" />
            </span>
            <select {...register("gender")} className="w-full p-3 outline-none">
              <option value="">Select Gender (Optional)</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Email */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaEnvelope className="text-white" />
            </span>
            <input
              type="email"
              placeholder="Email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" },
              })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}

          {/* Password */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            <span className="bg-blue-500 p-3">
              <FaKey className="text-white" />
            </span>
            <input
              type="password"
              placeholder="Password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" },
              })}
              className="w-full p-3 outline-none"
            />
          </div>
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition duration-200"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
