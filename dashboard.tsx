"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Camera,
  FileText,
  ImageIcon,
  Loader2,
  LogOut,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  User,
  UserCircle,
} from "lucide-react"
import { firebaseApp } from "./src/firebaseconfig"
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"
import { getDatabase, ref, push, get } from "firebase/database"
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

// Types remain the same as in the original code
type Medicine = {
  name: string
  consumption: string[]
  duration: string
  instruction?: string
}

type Test = {
  testName: string
  instruction: string
}

type UploadedDoc = {
  name: string
  url: string
}

type FormData = {
  professional: string
  doctorName?: string
  hospital?: string
  date: string
  symptoms: string
  specialInstruction?: string
  medicines: Medicine[]
  tests: Test[]
}

export default function Dashboard() {
  const auth = getAuth(firebaseApp)
  const database = getDatabase(firebaseApp)
  const storage = getStorage(firebaseApp)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [history, setHistory] = useState<FormData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [professionalValue, setProfessionalValue] = useState("")
  const prescriptionCameraInputRef = useRef<HTMLInputElement>(null)
  const prescriptionGalleryInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>()
  const {
    fields: medicineFields,
    append: appendMedicine,
    remove: removeMedicine,
  } = useFieldArray({ control, name: "medicines" })
  const { fields: testFields, append: appendTest, remove: removeTest } = useFieldArray({ control, name: "tests" })

  const professional = watch("professional")
  useEffect(() => {
    setProfessionalValue(professional)
  }, [professional])

  const filteredHistory = history.filter((record) =>
    Object.values(record).some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase())),
  )

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const dbRef = ref(database, `users/${user.uid}`)
        get(dbRef).then((snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val())
          }
        })
        const historyRef = ref(database, `history/${user.uid}`)
        get(historyRef).then((snapshot) => {
          if (snapshot.exists()) {
            const historyData = Object.entries(snapshot.val()).map(([key, value]) => ({ id: key, ...value }))
            setHistory(historyData)
          }
        })
      } else {
        setUserData(null)
      }
    })
    return unsubscribe
  }, [auth, database])

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // Sign-out successful.
      })
      .catch((error) => {
        // An error happened.
      })
  }

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0]
    handleUploadFile(file)
  }

  const handlePrescriptionUpload = (e: any) => {
    const file = e.target.files[0]
    handleUploadFile(file)
  }

  const handleUploadFile = async (file: any) => {
    if (!file) return
    setLoading(true)
    const storageRef = storageRef(storage, `uploads/${file.name}`)
    try {
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setUploadedDocs((prev) => [...prev, { name: file.name, url }])
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDoc = (index: number) => {
    const doc = uploadedDocs[index]
    const desertRef = storageRef(storage, `uploads/${doc.name}`)
    deleteObject(desertRef)
      .then(() => {
        setUploadedDocs((prev) => prev.filter((_, i) => i !== index))
      })
      .catch((error) => {
        console.error("Error deleting file:", error)
      })
  }

  const isImageFile = (fileName: string) => {
    const fileExtension = fileName.split(".").pop()?.toLowerCase()
    return ["jpg", "jpeg", "png", "gif", "bmp"].includes(fileExtension || "")
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const user = auth.currentUser
    if (user) {
      const newRecord = { ...data, documents: uploadedDocs, prescriptions: [] }
      const newRef = push(ref(database, `history/${user.uid}`), newRecord)
      await newRef
      setUploadedDocs([])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Medical Dashboard</h1>
            <p className="text-muted-foreground">Manage your prescriptions and medical history</p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="prescription" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="prescription">Prescription</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="prescription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  Patient Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userData ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Name:</span>
                        <span>{userData.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <span>{userData.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Age:</span>
                        <span>{userData.age}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {userData.bloodGroup && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Blood Group:</span>
                          <Badge variant="outline">{userData.bloodGroup}</Badge>
                        </div>
                      )}
                      {userData.weight && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Weight:</span>
                          <span>{userData.weight} kg</span>
                        </div>
                      )}
                      {userData.height && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Height:</span>
                          <span>{userData.height} cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading patient details...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Doctor Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="professional">Professional</Label>
                      <Select {...register("professional", { required: true })} defaultValue="">
                        <SelectTrigger>
                          <SelectValue placeholder="Select Professional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cardiologist">Cardiologist</SelectItem>
                          <SelectItem value="neurologist">Neurologist</SelectItem>
                          <SelectItem value="dermatologist">Dermatologist</SelectItem>
                          <SelectItem value="general">General Practitioner</SelectItem>
                          <SelectItem value="self">Self</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {professionalValue !== "self" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="doctorName">Doctor Name</Label>
                          <Input
                            {...register("doctorName", {
                              required: professionalValue !== "self",
                            })}
                            placeholder="Enter doctor's name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hospital">Hospital</Label>
                          <Input
                            {...register("hospital", {
                              required: professionalValue !== "self",
                            })}
                            placeholder="Enter hospital name"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input {...register("date", { required: true })} type="date" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Symptoms & Prescription
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="symptoms">Symptoms / Decision</Label>
                    <Textarea
                      {...register("symptoms", { required: true })}
                      placeholder="Describe the symptoms or your decision..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialInstruction">Special Instructions (Optional)</Label>
                    <Textarea {...register("specialInstruction")} placeholder="Any additional instructions..." />
                  </div>

                  <div className="space-y-4">
                    <Label>Upload Documents</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <Label
                          htmlFor="file-upload"
                          className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-primary"
                        >
                          <Upload className="h-5 w-5" />
                          <span>Click to upload or drag and drop</span>
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => prescriptionCameraInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4" />
                          Camera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => prescriptionGalleryInputRef.current?.click()}
                        >
                          <ImageIcon className="h-4 w-4" />
                          Gallery
                        </Button>
                      </div>
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

                    {uploadedDocs.length > 0 && (
                      <ScrollArea className="h-72 rounded-lg border p-4">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                          {uploadedDocs.map((doc, index) => (
                            <div key={index} className="group relative overflow-hidden rounded-lg border bg-background">
                              {isImageFile(doc.name) ? (
                                <img
                                  src={doc.url || "/placeholder.svg"}
                                  alt={doc.name}
                                  className="aspect-video w-full object-cover"
                                  onClick={() => window.open(doc.url, "_blank")}
                                />
                              ) : (
                                <div className="flex aspect-video items-center justify-center">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute right-2 top-2 hidden h-6 w-6 group-hover:flex"
                                onClick={() => handleRemoveDoc(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <div className="p-2">
                                <p className="truncate text-sm">{doc.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Medicines</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          appendMedicine({
                            name: "",
                            consumption: [],
                            duration: "",
                            instruction: "",
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Add Medicine
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {medicineFields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-6">
                            <div className="grid gap-4">
                              <div className="grid gap-2">
                                <Label>Medicine Name</Label>
                                <Input
                                  {...register(`medicines.${index}.name` as const, { required: true })}
                                  placeholder="Enter medicine name"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Consumption Time</Label>
                                <div className="flex gap-4">
                                  {["morning", "evening", "night"].map((time) => (
                                    <div key={time} className="flex items-center space-x-2">
                                      <Switch {...register(`medicines.${index}.consumption` as const)} value={time} />
                                      <Label className="capitalize">{time}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>Duration</Label>
                                <Input
                                  {...register(`medicines.${index}.duration` as const, { required: true })}
                                  placeholder="e.g., 5 days"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Instructions (Optional)</Label>
                                <Input
                                  {...register(`medicines.${index}.instruction` as const)}
                                  placeholder="Additional instructions"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                className="gap-2"
                                onClick={() => removeMedicine(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Medicine
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Tests</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => appendTest({ testName: "", instruction: "" })}
                      >
                        <Plus className="h-4 w-4" />
                        Add Test
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {testFields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-6">
                            <div className="grid gap-4">
                              <div className="grid gap-2">
                                <Label>Test Name</Label>
                                <Input
                                  {...register(`tests.${index}.testName` as const, { required: true })}
                                  placeholder="Enter test name"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Instructions</Label>
                                <Input
                                  {...register(`tests.${index}.instruction` as const, { required: true })}
                                  placeholder="Test instructions"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                className="gap-2"
                                onClick={() => removeTest(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Test
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="gap-2" size="lg">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Prescription"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>User History</CardTitle>
                <CardDescription>View and manage your medical records</CardDescription>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {filteredHistory.map((record) => (
                      <Card key={record.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg">{record.professional}</CardTitle>
                              <CardDescription>{record.date}</CardDescription>
                            </div>
                            {record.doctorName && <Badge variant="outline">Dr. {record.doctorName}</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Symptoms</Label>
                            <p className="text-sm text-muted-foreground">{record.symptoms}</p>
                          </div>

                          {record.medicines?.length > 0 && (
                            <div className="space-y-2">
                              <Label>Medicines</Label>
                              <div className="grid gap-2">
                                {record.medicines.map((med: Medicine, idx: number) => (
                                  <div key={idx} className="rounded-lg border p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{med.name}</span>
                                      <Badge variant="secondary">{med.duration}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Take: {med.consumption.join(", ")}
                                    </p>
                                    {med.instruction && (
                                      <p className="mt-1 text-sm text-muted-foreground">Note: {med.instruction}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {record.tests?.length > 0 && (
                            <div className="space-y-2">
                              <Label>Tests</Label>
                              <div className="grid gap-2">
                                {record.tests.map((test: Test, idx: number) => (
                                  <div key={idx} className="rounded-lg border p-3">
                                    <span className="font-medium">{test.testName}</span>
                                    <p className="mt-1 text-sm text-muted-foreground">{test.instruction}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(record.documents?.length > 0 || record.prescriptions?.length > 0) && (
                            <div className="space-y-2">
                              <Label>Attachments</Label>
                              <ScrollArea className="h-40">
                                <div className="grid grid-cols-3 gap-4">
                                  {[...(record.documents || []), ...(record.prescriptions || [])].map(
                                    (doc: UploadedDoc, idx: number) => (
                                      <div
                                        key={idx}
                                        className="group relative cursor-pointer overflow-hidden rounded-lg border"
                                        onClick={() => window.open(doc.url, "_blank")}
                                      >
                                        {isImageFile(doc.name) ? (
                                          <img
                                            src={doc.url || "/placeholder.svg"}
                                            alt={doc.name}
                                            className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                                          />
                                        ) : (
                                          <div className="flex aspect-video items-center justify-center bg-muted">
                                            <FileText className="h-8 w-8" />
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

