// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


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
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
