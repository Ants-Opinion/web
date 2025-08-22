// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxBQ-MXAjp8pwtCyZDeyo6CAgU1jk-Xxs",
  authDomain: "public-opinion-for-strock.firebaseapp.com",
  projectId: "public-opinion-for-strock",
  storageBucket: "public-opinion-for-strock.firebasestorage.app",
  messagingSenderId: "405499431793",
  appId: "1:405499431793:web:405c0c3d14f2a7e58004d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app; 