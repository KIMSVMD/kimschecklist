import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBvBlpOcer5AxhQcJZzTFdEH-nCv3duGI8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kimschecklist.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://kimschecklist-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kimschecklist",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kimschecklist.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "885931584908",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:885931584908:web:ea98ff77f186459c5f7aa9",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
