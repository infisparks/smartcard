// firebaseconfig.ts
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyD4Nf3aD7nK3ZHhaF0leTO6vg2Q1EwzSk8",
  authDomain: "billing1-b9ebd.firebaseapp.com",
  databaseURL: "https://billing1-b9ebd-default-rtdb.firebaseio.com",
  projectId: "billing1-b9ebd",
  storageBucket: "billing1-b9ebd.firebasestorage.app",
  messagingSenderId: "811498081209",
  appId: "1:811498081209:web:55ea2e49aa410623404468",
  measurementId: "G-349RRXWFLZ"
};

export const firebaseApp = initializeApp(firebaseConfig);
