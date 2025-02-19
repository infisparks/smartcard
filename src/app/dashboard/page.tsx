'use client';

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  FaUserMd,
  FaStethoscope,
  FaPlus,
  FaTrash,
  FaSpinner,
  FaFileAlt,
  FaCamera,
  FaImages,
  FaSignOutAlt,
} from "react-icons/fa";
import { firebaseApp } from "../../firebaseconfig";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getDatabase, ref, push, get } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ----- Types -----
type Medicine = {
  name: string;
  consumption: string[]; // e.g., ["morning", "evening", "night"]
  duration: string;
  instruction?: string;
};

type Test = {
  testName: string;
  instruction: string;
};

type UploadedDoc = {
  name: string;
  url: string;
};

type FormData = {
  professional: string;
  doctorName?: string;
  hospital?: string;
  date: string;
  symptoms: string;
  specialInstruction?: string;
  medicines: Medicine[];
  tests: Test[];
};

// ----- Dashboard Component -----
const Dashboard = () => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      professional: "",
      doctorName: "",
      hospital: "",
      date: new Date().toISOString().slice(0, 10),
      symptoms: "",
      specialInstruction: "",
      medicines: [],
      tests: [],
    },
  });

  const {
    fields: medicineFields,
    append: appendMedicine,
    remove: removeMedicine,
  } = useFieldArray({
    control,
    name: "medicines",
  });

  const {
    fields: testFields,
    append: appendTest,
    remove: removeTest,
  } = useFieldArray({
    control,
    name: "tests",
  });

  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp);
  const storage = getStorage(firebaseApp);

  // ----- States & Refs -----
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [loading, setLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploadedPrescriptions, setUploadedPrescriptions] = useState<UploadedDoc[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for hidden prescription file inputs
  const prescriptionCameraInputRef = useRef<HTMLInputElement>(null);
  const prescriptionGalleryInputRef = useRef<HTMLInputElement>(null);

  // Watch professional value to conditionally hide/show fields.
  const professionalValue = watch("professional");

  // ----- Listen for Auth State Changes & Fetch User Data -----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Fetch user details
        const uid = user.uid;
        const userRef = ref(database, `users/${uid}`);
        get(userRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              setUserData(snapshot.val());
            }
          })
          .catch((err) => console.error("Error fetching user data:", err));

        // If in history tab, fetch prescription records
        if (activeTab === "history") {
          const detailsRef = ref(database, `users/${uid}/detail`);
          get(detailsRef)
            .then((snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.val();
                const historyData = Object.keys(data).map((key) => ({
                  id: key,
                  ...data[key],
                }));
                // Sort by date descending (latest first)
                historyData.sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setHistory(historyData);
              } else {
                setHistory([]);
              }
            })
            .catch((err) => console.error("Error fetching history:", err));
        }
      }
    });
    return () => unsubscribe();
  }, [activeTab, auth, database]);

  // ----- Logout Handler -----
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("You have been logged out.");
    } catch (error: any) {
      console.error("Error signing out:", error.message);
    }
  };

  // ----- Document Upload Handlers -----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("User not logged in");
      return;
    }
    const uid = currentUser.uid;
    const newDocs: UploadedDoc[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uniqueName = `${Date.now()}_${file.name}`;
      const fileRef = storageRef(
        storage,
        `users/${uid}/documents/${uniqueName}`
      );
      try {
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        newDocs.push({ name: uniqueName, url: downloadURL });
      } catch (error: any) {
        console.error("Error uploading file:", error.message);
      }
    }
    setUploadedDocs((prev) => [...prev, ...newDocs]);
    e.target.value = "";
  };

  const handleRemoveDoc = async (index: number) => {
    const doc = uploadedDocs[index];
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;
    try {
      const fileRef = storageRef(
        storage,
        `users/${uid}/documents/${doc.name}`
      );
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error deleting file:", error);
    }
    setUploadedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  // ----- Prescription Upload Handler (Shared for both Camera & Gallery) -----
  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("User not logged in");
      return;
    }
    const uid = currentUser.uid;
    const newPrescriptions: UploadedDoc[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uniqueName = `${Date.now()}_${file.name}`;
      const fileRef = storageRef(
        storage,
        `users/${uid}/prescriptions/${uniqueName}`
      );
      try {
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        newPrescriptions.push({ name: uniqueName, url: downloadURL });
      } catch (error: any) {
        console.error("Error uploading prescription:", error.message);
      }
    }
    setUploadedPrescriptions((prev) => [...prev, ...newPrescriptions]);
    e.target.value = "";
  };

  const handleRemovePrescription = async (index: number) => {
    const pres = uploadedPrescriptions[index];
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;
    try {
      const fileRef = storageRef(
        storage,
        `users/${uid}/prescriptions/${pres.name}`
      );
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error deleting prescription:", error);
    }
    setUploadedPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  // ----- Form Submission: Save Prescription Data -----
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not logged in");
      const uid = currentUser.uid;
      const finalData = {
        ...data,
        documents: uploadedDocs,
        prescriptions: uploadedPrescriptions,
      };
      await push(ref(database, `users/${uid}/detail`), finalData);
      alert("Data saved successfully!");
      reset();
      setUploadedDocs([]);
      setUploadedPrescriptions([]);
    } catch (error: any) {
      console.error("Error saving data:", error.message);
      alert("Error saving data. Please try again.");
    }
    setLoading(false);
  };

  // ----- Filter History based on Search Query -----
  const filteredHistory = history.filter((record) => {
    const query = searchQuery.toLowerCase();
    return (
      record.professional?.toLowerCase().includes(query) ||
      record.doctorName?.toLowerCase().includes(query) ||
      record.hospital?.toLowerCase().includes(query) ||
      record.symptoms?.toLowerCase().includes(query) ||
      record.date?.toLowerCase().includes(query)
    );
  });

  // Helper: Check if file is an image based on extension
  const isImageFile = (filename: string) => {
    return /\.(jpeg|jpg|gif|png)$/i.test(filename);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      {/* ---- Header with Tabs & Logout Button ---- */}
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "form"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            Prescription
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "history"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-600 hover:text-green-600"
            }`}
          >
            User History
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        {activeTab === "form" ? (
          <>
            {/* ---- Patient Details Card ---- */}
            <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Patient Details</h2>
              {userData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-700">
                      <span className="font-semibold">Name:</span> {userData.name}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Email:</span> {userData.email}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Age:</span> {userData.age}
                    </p>
                    {userData.gender && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Gender:</span> {userData.gender}
                      </p>
                    )}
                  </div>
                  <div>
                    {userData.bloodGroup && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Blood Group:</span> {userData.bloodGroup}
                      </p>
                    )}
                    {userData.weight && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Weight:</span> {userData.weight} kg
                      </p>
                    )}
                    {userData.height && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Height:</span> {userData.height} cm
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Loading patient details...</p>
              )}
            </div>

            {/* ---- Prescription Form ---- */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
              {/* ---- Doctor Details Card ---- */}
              <div className="bg-white shadow-lg rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FaUserMd className="text-blue-600" /> Doctor Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Professional */}
                  <div>
                    <label className="block text-sm font-medium">
                      Professional
                    </label>
                    <select
                      {...register("professional", { required: true })}
                      className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                    >
                      <option value="">Select Professional</option>
                      <option value="cardiologist">Cardiologist</option>
                      <option value="neurologist">Neurologist</option>
                      <option value="dermatologist">Dermatologist</option>
                      <option value="general">General Practitioner</option>
                      <option value="self">Self</option>
                    </select>
                  </div>

                  {/* Conditionally Render Doctor's Name & Hospital if NOT "Self" */}
                  {professionalValue !== "self" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium">
                          Doctor Name
                        </label>
                        <input
                          {...register("doctorName", {
                            required: professionalValue !== "self",
                          })}
                          type="text"
                          placeholder="Enter your name"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Hospital Name
                        </label>
                        <input
                          {...register("hospital", {
                            required: professionalValue !== "self",
                          })}
                          type="text"
                          placeholder="Enter hospital name"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                    </>
                  )}

                  {/* Date Field */}
                  <div>
                    <label className="block text-sm font-medium">Date</label>
                    <input
                      {...register("date", { required: true })}
                      type="date"
                      className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              {/* ---- Symptoms & Prescription Card ---- */}
              <div className="bg-white shadow-lg rounded-lg p-6 space-y-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FaStethoscope className="text-green-600" /> Symptoms & Prescription
                </h2>
                {/* Symptoms / Decision */}
                <div>
                  <label className="block text-sm font-medium">
                    Symptoms / Decision
                  </label>
                  <textarea
                    {...register("symptoms", { required: true })}
                    rows={4}
                    placeholder="Describe the symptoms or your decision..."
                    className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-green-200"
                  />
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    {...register("specialInstruction")}
                    rows={3}
                    placeholder="Any additional instructions..."
                    className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-green-200"
                  />
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Documents (Camera or Gallery)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadedDocs.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedDocs.map((doc, index) => (
                        <div
                          key={index}
                          className="relative border rounded p-2 bg-gray-50"
                        >
                          {isImageFile(doc.name) ? (
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="object-cover h-24 w-full rounded cursor-pointer"
                              onClick={() => window.open(doc.url, "_blank")}
                            />
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center h-24 cursor-pointer"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              <FaFileAlt className="text-3xl text-gray-500" />
                              <p className="text-xs text-gray-600 truncate">
                                {doc.name}
                              </p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(index)}
                            className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescription Upload Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload Prescription Image(s)
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => prescriptionCameraInputRef.current?.click()}
                      className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      <FaCamera /> Capture from Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => prescriptionGalleryInputRef.current?.click()}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      <FaImages /> Select from Gallery
                    </button>
                  </div>
                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={prescriptionCameraInputRef}
                    onChange={handlePrescriptionUpload}
                    className="hidden"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    ref={prescriptionGalleryInputRef}
                    onChange={handlePrescriptionUpload}
                    className="hidden"
                  />
                  {uploadedPrescriptions.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedPrescriptions.map((pres, index) => (
                        <div
                          key={index}
                          className="relative border rounded p-2 bg-gray-50"
                        >
                          {isImageFile(pres.name) ? (
                            <img
                              src={pres.url}
                              alt={pres.name}
                              className="object-cover h-24 w-full rounded cursor-pointer"
                              onClick={() => window.open(pres.url, "_blank")}
                            />
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center h-24 cursor-pointer"
                              onClick={() => window.open(pres.url, "_blank")}
                            >
                              <FaFileAlt className="text-3xl text-gray-500" />
                              <p className="text-xs text-gray-600 truncate">
                                {pres.name}
                              </p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePrescription(index)}
                            className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medicines Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Medicines
                  </label>
                  {medicineFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="mb-6 border p-4 rounded-lg bg-gray-50"
                    >
                      <div className="mb-3">
                        <label className="block text-sm font-medium">
                          Medicine Name
                        </label>
                        <input
                          {...register(
                            `medicines.${index}.name` as const,
                            { required: true }
                          )}
                          type="text"
                          placeholder="Enter medicine name"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium">
                          Consumption Time
                        </label>
                        <div className="flex gap-4 mt-1">
                          {["morning", "evening", "night"].map((time) => (
                            <label
                              key={time}
                              className="flex items-center space-x-1 text-sm"
                            >
                              <input
                                type="checkbox"
                                value={time}
                                {...register(
                                  `medicines.${index}.consumption` as const
                                )}
                                className="h-4 w-4"
                              />
                              <span className="capitalize">{time}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium">
                          Duration
                        </label>
                        <input
                          {...register(
                            `medicines.${index}.duration` as const,
                            { required: true }
                          )}
                          type="text"
                          placeholder="e.g., 5 days"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium">
                          Instructions (Optional)
                        </label>
                        <input
                          {...register(`medicines.${index}.instruction` as const)}
                          type="text"
                          placeholder="Additional instructions"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        className="flex items-center gap-1 text-red-500 text-sm hover:underline"
                      >
                        <FaTrash /> Remove Medicine
                      </button>
                    </div>
                  ))}
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
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <FaPlus /> Add Medicine
                  </button>
                </div>

                {/* Tests Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tests
                  </label>
                  {testFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="mb-6 border p-4 rounded-lg bg-gray-50"
                    >
                      <div className="mb-3">
                        <label className="block text-sm font-medium">
                          Test Name
                        </label>
                        <input
                          {...register(
                            `tests.${index}.testName` as const,
                            { required: true }
                          )}
                          type="text"
                          placeholder="Enter test name (e.g., X-ray, Blood Test)"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium">
                          Instructions
                        </label>
                        <input
                          {...register(
                            `tests.${index}.instruction` as const,
                            { required: true }
                          )}
                          type="text"
                          placeholder="Additional instructions for the test"
                          className="mt-1 block w-full border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTest(index)}
                        className="flex items-center gap-1 text-red-500 text-sm hover:underline"
                      >
                        <FaTrash /> Remove Test
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      appendTest({ testName: "", instruction: "" })
                    }
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <FaPlus /> Add Test
                  </button>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200"
                  >
                    {loading && <FaSpinner className="animate-spin" />}
                    <span>{loading ? "Saving..." : "Save Prescription"}</span>
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          // ----- User History Tab -----
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">User History</h2>
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-green-200"
              />
            </div>
            {/* User Main Details */}
            {userData ? (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-700">
                      <span className="font-semibold">Name:</span> {userData.name}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Email:</span> {userData.email}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Age:</span> {userData.age}
                    </p>
                    {userData.gender && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Gender:</span> {userData.gender}
                      </p>
                    )}
                  </div>
                  <div>
                    {userData.bloodGroup && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Blood Group:</span> {userData.bloodGroup}
                      </p>
                    )}
                    {userData.weight && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Weight:</span> {userData.weight} kg
                      </p>
                    )}
                    {userData.height && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Height:</span> {userData.height} cm
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Loading user details...</p>
            )}

            {/* Prescription Records */}
            {filteredHistory.length > 0 ? (
              <div className="space-y-6">
                {filteredHistory.map((record) => (
                  <div
                    key={record.id}
                    className="border p-6 rounded-lg bg-white shadow hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Date:</span> {record.date}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Professional:</span> {record.professional}
                        </p>
                        {record.doctorName && (
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Doctor Name:</span> {record.doctorName}
                          </p>
                        )}
                        {record.hospital && (
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Hospital:</span> {record.hospital}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-gray-700 mb-2">
                        <span className="font-semibold">Symptoms:</span> {record.symptoms}
                      </p>
                      {record.specialInstruction && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Special Instructions:</span> {record.specialInstruction}
                        </p>
                      )}
                    </div>
                    {record.medicines && record.medicines.length > 0 && (
                      <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-2">Medicines:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {record.medicines.map((med: Medicine, idx: number) => (
                            <li key={idx}>
                              <span className="font-semibold">Name:</span> {med.name} |{" "}
                              <span className="font-semibold">Consumption:</span> {med.consumption.join(", ")} |{" "}
                              <span className="font-semibold">Duration:</span> {med.duration}
                              {med.instruction && (
                                <> | <span className="font-semibold">Instructions:</span> {med.instruction}</>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {record.tests && record.tests.length > 0 && (
                      <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-2">Tests:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {record.tests.map((tst: Test, idx: number) => (
                            <li key={idx}>
                              <span className="font-semibold">Test:</span> {tst.testName} |{" "}
                              <span className="font-semibold">Instructions:</span> {tst.instruction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {record.documents && record.documents.length > 0 && (
                      <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-2">Documents:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {record.documents.map((doc: UploadedDoc, idx: number) => (
                            <div
                              key={idx}
                              className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              {isImageFile(doc.name) ? (
                                <img src={doc.url} alt={doc.name} className="object-cover h-32 w-full" />
                              ) : (
                                <div className="flex flex-col items-center justify-center h-32 bg-gray-100">
                                  <FaFileAlt className="text-3xl text-gray-500" />
                                  <p className="text-xs text-gray-600 p-2 text-center">{doc.name}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {record.prescriptions && record.prescriptions.length > 0 && (
                      <div className="mb-4">
                        <p className="font-semibold text-gray-700 mb-2">Prescriptions:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {record.prescriptions.map((pres: UploadedDoc, idx: number) => (
                            <div
                              key={idx}
                              className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => window.open(pres.url, "_blank")}
                            >
                              {isImageFile(pres.name) ? (
                                <img src={pres.url} alt={pres.name} className="object-cover h-32 w-full" />
                              ) : (
                                <div className="flex flex-col items-center justify-center h-32 bg-gray-100">
                                  <FaFileAlt className="text-3xl text-gray-500" />
                                  <p className="text-xs text-gray-600 p-2 text-center">{pres.name}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No history available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
