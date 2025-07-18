<<<<<<< HEAD
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBnvKuPK2i51kqzF4c-e0h6AFkU4NFon0M", 
  authDomain: "ridesafely-258c0.firebaseapp.com",
  projectId: "ridesafely-258c0",
  storageBucket: "ridesafely-258c0.firebasestorage.app",
  messagingSenderId: "1053665185198",
  appId: "1:1053665185198:web:97130eb1e472c0657f8c3f",
  measurementId: "G-8Y3N7LY01D" 
=======
// firebaseConfig.ts
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Make sure this is imported

const firebaseConfig = {
  apiKey: "AIzaSyBnvKuPK2i51kqzF4c-e0h6AFkU4NFon0M", // KEEP YOUR ACTUAL API KEY
  authDomain: "ridesafely-258c0.firebaseapp.com",
  projectId: "ridesafely-258c0",
  // This storageBucket property is still good to have for other SDK parts,
  // but we'll also explicitly pass the gs:// URL to getStorage.
  storageBucket: "ridesafely-258c0.firebasestorage.app",
  messagingSenderId: "1053665185198",
  appId: "1:1053665185198:web:97130eb1e472c0657f8c3f",
  measurementId: "G-8Y3N7LY01D" // Optional
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
};

let app: FirebaseApp;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized!");
} else {
  app = getApp();
  console.log("Firebase already initialized, using existing app.");
}

const db = getFirestore(app);
<<<<<<< HEAD
=======

// Explicitly pass the full gs:// URL to getStorage()
// This is the user-confirmed gs:// path.
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
const storage = getStorage(app, "gs://ridesafely-258c0.firebasestorage.app");
console.log("Firebase Storage initialized for bucket: gs://ridesafely-258c0.firebasestorage.app");

export { app, db, storage };
