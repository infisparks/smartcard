import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  // Your Firebase config here
}

const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export const firebaseApp = app

