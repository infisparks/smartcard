"use client";
import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Activity,
  AlertCircle,
  Calendar,
  Camera,
  Clock,
  FileText,
  
  HelpCircle,
  Image,
  LogOut,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  X,
  Menu,
  BriefcaseMedical,
} from "lucide-react";

import { firebaseApp } from "../../firebaseconfig";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, push, get } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ----- Interfaces -----
interface Medicine {
  name: string;
  consumption: string[];
  duration: string;
  instruction: string;
}

interface Test {
  testName: string;
  instruction: string;
}

interface UploadedDoc {
  name: string;
  url: string;
}

interface PrescriptionData {
  id?: string; // Added optional id field
  professional: string;
  doctorName?: string;
  hospital?: string;
  date: string;
  symptoms: string;
  specialInstruction?: string;
  medicines: Medicine[];
  tests: Test[];
  documents: UploadedDoc[];
  uid: string;
  // Optional timestamp if saved that way
  timestamp?: number;
}

interface UserData {
  name: string;
  email: string;
  age: string;
  gender: string;
  bloodGroup?: string;
  weight?: string;
  height?: string;
}

// ----- Dashboard Component -----
const Dashboard = () => {
  // Tab state: "form" or "history"
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [historyRecords, setHistoryRecords] = useState<PrescriptionData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Setup react-hook-form with default values
  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
  } = useForm({
    defaultValues: {
      professional: "",
      doctorName: "",
      hospital: "",
      date: new Date().toISOString().slice(0, 10),
      symptoms: "",
      specialInstruction: "",
      medicines: [] as Medicine[],
      tests: [] as Test[],
    },
  });

  // Manage medicines array
  const {
    fields: medicineFields,
    append: appendMedicine,
    remove: removeMedicine,
  } = useFieldArray({
    control,
    name: "medicines",
  });

  // Manage tests array
  const {
    fields: testFields,
    append: appendTest,
    remove: removeTest,
  } = useFieldArray({
    control,
    name: "tests",
  });

  // Watch professional value to conditionally show doctor/hospital fields
  const professionalValue = watch("professional");

  // ----- Firebase: Listen for Auth Changes and Fetch Data -----
  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const db = getDatabase(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        // Fetch user details (assumed stored under "users/{uid}")
        get(ref(db, `users/${uid}`))
          .then((snapshot) => {
            if (snapshot.exists()) {
              setUserData(snapshot.val());
            }
          })
          .catch((err) => console.error("Error fetching user data:", err));

        // If on history tab, fetch prescription records from the "detail" node
        if (activeTab === "history") {
          get(ref(db, `users/${uid}/detail`))
            .then((snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.val();
                const records = Object.keys(data).map((key) => ({
                  id: key,
                  ...data[key],
                }));
                // Sort records by date descending (latest first)
                records.sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setHistoryRecords(records);
              } else {
                setHistoryRecords([]);
              }
            })
            .catch((err) => console.error("Error fetching history:", err));
        }
      }
    });
    return () => unsubscribe();
  }, [activeTab]);

  // ----- Tooltip Helper -----
  const showTooltipMessage = (
    message: string,
    event: React.SyntheticEvent
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipContent(message);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };

  // ----- Logout Handler -----
  const handleLogout = async () => {
    const auth = getAuth(firebaseApp);
    try {
      await signOut(auth);
      // You may redirect to a login page here if needed
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ----- File Upload Handler -----
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files) return;
    setLoading(true);
    const files = Array.from(event.target.files);
    const storage = getStorage(firebaseApp);
    try {
      const uploadPromises = files.map(async (file) => {
        const uniqueName = `${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, `documents/${uniqueName}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        return { name: uniqueName, url };
      });
      const newDocs = await Promise.all(uploadPromises);
      setUploadedDocs((prev) => [...prev, ...newDocs]);
      showTooltipMessage(
        "Files uploaded successfully!",
        event as React.SyntheticEvent
      );
    } catch (error: any) {
      console.error("Upload error:", error);
      showTooltipMessage(
        "Error uploading files. Please try again.",
        event as React.SyntheticEvent
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  // ----- Remove Document Handler -----
  const handleRemoveDoc = async (
    index: number,
    event: React.MouseEvent
  ) => {
    const doc = uploadedDocs[index];
    const storage = getStorage(firebaseApp);
    try {
      const docRef = storageRef(storage, `documents/${doc.name}`);
      await deleteObject(docRef);
      setUploadedDocs((prev) => prev.filter((_, i) => i !== index));
      showTooltipMessage(
        "Document removed successfully!",
        event as React.SyntheticEvent
      );
    } catch (error) {
      console.error("Delete error:", error);
      showTooltipMessage(
        "Error removing document. Please try again.",
        event as React.SyntheticEvent
      );
    }
  };

  // ----- Form Submission -----
  const onSubmit = async (data: any) => {
    setLoading(true);
    const auth = getAuth(firebaseApp);
    const db = getDatabase(firebaseApp);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showTooltipMessage(
        "User not logged in",
        { currentTarget: document.body } as unknown as React.SyntheticEvent
      );
      setLoading(false);
      return;
    }
    try {
      const uid = currentUser.uid;
      const prescriptionData: PrescriptionData = {
        ...data,
        documents: uploadedDocs,
        uid,
        timestamp: Date.now(),
      };
      // Save the prescription under the user's "detail" node
      await push(ref(db, `users/${uid}/detail`), prescriptionData);
      showTooltipMessage(
        "Prescription saved successfully!",
        { currentTarget: document.body } as unknown as React.SyntheticEvent
      );
      reset();
      setUploadedDocs([]);
    } catch (error) {
      console.error("Submit error:", error);
      showTooltipMessage(
        "Error saving prescription. Please try again.",
        { currentTarget: document.body } as unknown as React.SyntheticEvent
      );
    } finally {
      setLoading(false);
    }
  };

  // ----- Utility: Check if file is an image -----
  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif)$/i.test(filename);
  };

  // ----- Compute Filtered History Based on Search Query -----
  const filteredHistory = historyRecords.filter((record) => {
    const query = searchQuery.toLowerCase();
    return (
      record.date.toLowerCase().includes(query) ||
      record.professional.toLowerCase().includes(query) ||
      (record.doctorName &&
        record.doctorName.toLowerCase().includes(query)) ||
      (record.hospital &&
        record.hospital.toLowerCase().includes(query)) ||
      record.symptoms.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* ----- Header ----- */}
      <header className="bg-white shadow-lg px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InfiCare
            </h1>
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <button
              onClick={() => {
                setActiveTab("form");
                setShowMobileMenu(false);
              }}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeTab === "form"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Prescription</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setShowMobileMenu(false);
              }}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeTab === "history"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>History</span>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </nav>
          {/* Mobile Navigation Toggle */}
          <button
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <nav className="md:hidden mt-4">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setActiveTab("form");
                  setShowMobileMenu(false);
                }}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeTab === "form"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Prescription</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setActiveTab("history");
                  setShowMobileMenu(false);
                }}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeTab === "history"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>History</span>
                </div>
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* ----- Main Content ----- */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "form" ? (
          <>
            {/* Patient Details Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Patient Details
                </h2>
              </div>
              {userData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                  {Object.entries({
  Name: userData.name,
  Email: userData.email,
  Age: userData.age,
  Gender: userData.gender,
}).map(([key, value]) =>
  value && (
    <div key={key}>
      <span className="text-gray-500 font-medium">
        {/* Use two non-breaking spaces for precise spacing */}
        {key}:&nbsp;&nbsp;{value}
      </span>
    </div>
  )
)}


                  </div>
                  <div className="space-y-4">
                    {Object.entries({
                      "Blood Group": userData.bloodGroup,
                      Weight: userData.weight ? `${userData.weight} kg` : null,
                      Height: userData.height ? `${userData.height} cm` : null,
                    }).map(
                      ([key, value]) =>
                        value && (
                          <div key={key} className="flex items-center">
  <span className="text-gray-500 font-medium min-w-[100px]">
    {key}:&nbsp;&nbsp;{value}
  </span>
</div>

                        )
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-5 h-5 animate-spin" />
                  <span>Loading patient details...</span>
                </div>
              )}
            </div>

            {/* Prescription Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Doctor Details */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Doctor Details
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Professional Select */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Professional
                    </label>
                    <div className="relative">
                      <select
                        {...register("professional", { required: true })}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="">Select Professional</option>
                        <option value="cardiologist">Cardiologist</option>
                        <option value="neurologist">Neurologist</option>
                        <option value="dermatologist">Dermatologist</option>
                        <option value="general">General Practitioner</option>
                        <option value="self">Self</option>
                      </select>
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>

                  {/* Conditionally Render Doctor Name & Hospital */}
                  {professionalValue !== "self" && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Doctor Name
                        </label>
                        <div className="relative">
                          <input
                            {...register("doctorName", {
                              required: professionalValue !== "self",
                            })}
                            type="text"
                            placeholder="Enter doctor's name"
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          />
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Hospital Name
                        </label>
                        <div className="relative">
                          <input
                            {...register("hospital", {
                              required: professionalValue !== "self",
                            })}
                            type="text"
                            placeholder="Enter hospital name"
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                          />
                          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Date Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <div className="relative">
                      <input
                        {...register("date", { required: true })}
                        type="date"
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      />
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Symptoms & Prescription */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Stethoscope className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Symptoms & Prescription
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Symptoms */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Symptoms / Decision
                    </label>
                    <textarea
                      {...register("symptoms", { required: true })}
                      rows={4}
                      placeholder="Describe the symptoms or your decision..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Special Instructions (Optional)
                    </label>
                    <textarea
                      {...register("specialInstruction")}
                      rows={3}
                      placeholder="Any additional instructions..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Upload Documents
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors duration-300">
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg cursor-pointer hover:bg-green-100 transition-colors duration-300">
                        <Image className="w-4 h-4" />
                        <span>Choose Files</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Document Preview */}
                    {uploadedDocs.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {uploadedDocs.map((doc, index) => (
                          <div
                            key={index}
                            className="group relative rounded-lg overflow-hidden bg-gray-50 hover:shadow-lg transition-all duration-300"
                          >
                            {isImageFile(doc.name) ? (
                              <img
                                src={doc.url}
                                alt={doc.name}
                                className="w-full h-32 object-cover cursor-pointer"
                                onClick={() => window.open(doc.url, "_blank")}
                              />
                            ) : (
                              <div
                                className="h-32 flex flex-col items-center justify-center p-4 cursor-pointer"
                                onClick={() => window.open(doc.url, "_blank")}
                              >
                                <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-xs text-gray-600 text-center truncate w-full">
                                  {doc.name}
                                </p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveDoc(index, e)}
                              className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medicines Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <BriefcaseMedical className="w-4 h-4 text-blue-500" />
                        Medicines
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          appendMedicine({
                            name: "",
                            consumption: [],
                            duration: "",
                            instruction: "",
                          })
                        }
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors duration-300"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Medicine</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {medicineFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-4 rounded-lg bg-gray-50 border border-gray-100 hover:shadow-md transition-all duration-300"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Medicine Name
                              </label>
                              <input
                                {...register(
                                  `medicines.${index}.name` as const,
                                  { required: true }
                                )}
                                placeholder="Enter medicine name"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Duration
                              </label>
                              <input
  type="number"
  {...register(`medicines.${index}.duration` as const, {
    required: true,
    valueAsNumber: true,
  })}
  placeholder="e.g., 5"
  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
/>

                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Consumption Time
                            </label>
                            <div className="flex flex-wrap gap-4">
                              {["morning", "afternoon", "evening", "night"].map(
                                (time) => (
                                  <label
                                    key={time}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      value={time}
                                      {...register(
                                        `medicines.${index}.consumption` as const
                                      )}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 capitalize">
                                      {time}
                                    </span>
                                  </label>
                                )
                              )}
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Instructions (Optional)
                            </label>
                            <input
                              {...register(
                                `medicines.${index}.instruction` as const
                              )}
                              placeholder="Additional instructions"
                              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMedicine(index)}
                            className="mt-4 flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors duration-300"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove Medicine</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tests Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        Tests
                      </label>
                      <button
                        type="button"
                        onClick={() => appendTest({ testName: "", instruction: "" })}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors duration-300"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Test</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {testFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-4 rounded-lg bg-gray-50 border border-gray-100 hover:shadow-md transition-all duration-300"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Test Name
                              </label>
                              <input
                                {...register(`tests.${index}.testName` as const, { required: true })}
                                placeholder="Enter test name"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Instructions
                              </label>
                              <input
                                {...register(`tests.${index}.instruction` as const, { required: true })}
                                placeholder="Test instructions"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTest(index)}
                            className="mt-4 flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors duration-300"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove Test</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        <span>Save Prescription</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          // ----- History Tab -----
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                User History
              </h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                />
              </div>
            </div>

            {/* History Records */}
            <div className="space-y-6">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-100 rounded-lg p-6 hover:shadow-md transition-all duration-300"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Date:</span>
                          {record.date}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserCheck className="w-4 h-4 text-green-500" />
                          <span className="font-medium">Professional:</span>
                          {record.professional}
                        </div>
                        {record.doctorName && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4 text-purple-500" />
                            <span className="font-medium">Doctor:</span>
                            {record.doctorName}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {record.hospital && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <FileText className="w-4 h-4 text-red-500" />
                            <span className="font-medium">Hospital:</span>
                            {record.hospital}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                        Symptoms
                      </h3>
                      <p className="text-gray-600">{record.symptoms}</p>
                      {record.specialInstruction && (
                        <div className="mt-4">
                          <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-purple-500" />
                            Special Instructions
                          </h3>
                          <p className="text-gray-600">{record.specialInstruction}</p>
                        </div>
                      )}
                    </div>
                    {/* Medicines */}
                    {record.medicines && record.medicines.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                          <BriefcaseMedical className="w-4 h-4 text-blue-500" />
                          Medicines
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {record.medicines.map((med: Medicine, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-blue-50 rounded-lg hover:shadow-md transition-all duration-300"
                            >
                              <p className="font-medium text-blue-800">{med.name}</p>
                              <div className="mt-2 space-y-1 text-sm">
                                <p className="text-gray-600">
                                  <span className="font-medium">Take:</span>{" "}
                                  {med.consumption.join(", ")}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Duration:</span>{" "}
                                  {med.duration}
                                </p>
                                {med.instruction && (
                                  <p className="text-gray-600">
                                    <span className="font-medium">Instructions:</span>{" "}
                                    {med.instruction}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Tests */}
                    {record.tests && record.tests.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-purple-500" />
                          Tests
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {record.tests.map((test: Test, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-purple-50 rounded-lg hover:shadow-md transition-all duration-300"
                            >
                              <p className="font-medium text-purple-800">
                                {test.testName}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                <span className="font-medium">Instructions:</span>{" "}
                                {test.instruction}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Documents */}
                    {record.documents && record.documents.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-500" />
                          Documents
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {record.documents.map((doc: UploadedDoc, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => window.open(doc.url, "_blank")}
                              className="cursor-pointer group relative"
                            >
                              {isImageFile(doc.name) ? (
                                <img
                                  src={doc.url}
                                  alt={doc.name}
                                  className="w-full h-32 object-cover rounded-lg group-hover:opacity-75 transition-opacity duration-300"
                                />
                              ) : (
                                <div className="h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center p-4 group-hover:bg-gray-200 transition-colors duration-300">
                                  <FileText className="w-8 h-8 text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-600 text-center truncate w-full">
                                    {doc.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No history records found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ----- Tooltip ----- */}
      {showTooltip && (
        <div
          className="fixed z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg transition-opacity duration-300"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
