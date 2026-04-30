import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBhH_i3ipdUTDGzUz8zTSzH9T-GHrdVRHg",
  authDomain: "stock-sell.firebaseapp.com",
  projectId: "stock-sell",
  storageBucket: "stock-sell.firebasestorage.app",
  messagingSenderId: "22003150351",
  appId: "1:22003150351:web:6352860ef01b35f50dbd7a",
  measurementId: "G-P46N262DHL"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);