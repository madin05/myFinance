import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider, reauthenticateWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, onIdTokenChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, sendEmailVerification, sendPasswordResetEmail, applyActionCode, confirmPasswordReset, verifyPasswordResetCode, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAhRZU5UEnVUhBONJLvAU3u82MiKy8NDwE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "myfinance-84d9b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "myfinance-84d9b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "myfinance-84d9b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "394885732225",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:394885732225:web:c1e5e1524642afeef8fa80",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DLHXX2ZQRZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, EmailAuthProvider, reauthenticateWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, onIdTokenChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, sendEmailVerification, sendPasswordResetEmail, applyActionCode, confirmPasswordReset, verifyPasswordResetCode, updateProfile };
