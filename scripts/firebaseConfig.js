// firebase.js or firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyBnvKuPK2i51kqzF4c-e0h6AFkU4NFon0M", // Your actual API key
  authDomain: "ridesafely-258c0.firebaseapp.com",
  projectId: "ridesafely-258c0",
  storageBucket: "ridesafely-258c0.appspot.com", // Corrected typical storageBucket format
  messagingSenderId: "1053665185198",
  appId: "1:1053665185198:web:97130eb1e472c0657f8c3f",
  measurementId: "G-8Y3N7LY01D"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app); // Initialize Firestore

export { app, db }; // Export db as well

