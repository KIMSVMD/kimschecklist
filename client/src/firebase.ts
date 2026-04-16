import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBvBlpOcer5AxhQcJZzTFdEH-nCv3duGI8",
  authDomain: "kimschecklist.firebaseapp.com",
  databaseURL: "https://kimschecklist-default-rtdb.firebaseio.com",
  projectId: "kimschecklist",
  storageBucket: "kimschecklist.firebasestorage.app",
  messagingSenderId: "885931584908",
  appId: "1:885931584908:web:ea98ff77f186459c5f7aa9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
