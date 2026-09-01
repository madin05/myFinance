import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider, reauthenticateWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, onIdTokenChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, sendEmailVerification, sendPasswordResetEmail, applyActionCode, confirmPasswordReset, verifyPasswordResetCode, updateProfile } from "firebase/auth";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAhRZU5UEnVUhBONJLvAU3u82MiKy8NDwE",
  authDomain: "myfinance-84d9b.firebaseapp.com",
  projectId: "myfinance-84d9b",
  storageBucket: "myfinance-84d9b.firebasestorage.app",
  messagingSenderId: "394885732225",
  appId: "1:394885732225:web:c1e5e1524642afeef8fa80",
  measurementId: "G-DLHXX2ZQRZ"
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, EmailAuthProvider, reauthenticateWithCredential, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, onIdTokenChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, sendEmailVerification, sendPasswordResetEmail, applyActionCode, confirmPasswordReset, verifyPasswordResetCode, updateProfile };
