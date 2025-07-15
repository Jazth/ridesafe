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
const storage = getStorage(app, "gs://ridesafely-258c0.firebasestorage.app");
console.log("Firebase Storage initialized for bucket: gs://ridesafely-258c0.firebasestorage.app");

export { app, db, storage };
