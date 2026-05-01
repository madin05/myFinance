import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAhRZU5UEnVUhBONJLvAU3u82MiKy8NDwE",
  authDomain: "myfinance-84d9b.firebaseapp.com",
  projectId: "myfinance-84d9b",
  storageBucket: "myfinance-84d9b.firebasestorage.app",
  messagingSenderId: "394885732225",
  appId: "1:394885732225:web:c1e5e1524642afeef8fa80",
  measurementId: "G-DLHXX2ZQRZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword };
