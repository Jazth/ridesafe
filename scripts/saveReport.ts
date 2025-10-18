import { db } from "@/scripts/firebaseConfig";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

export async function saveReport(reportData, photoUri, userInfo) {
  try {
    const storage = getStorage();
    const reportId = Date.now().toString();
    const reportRef = doc(db, "reports", reportId);

    let photoURL = "";

    // ✅ Upload photo proof if available
    if (photoUri) {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const photoRef = ref(storage, `reports/${reportId}.jpg`);
      await uploadBytes(photoRef, blob);
      photoURL = await getDownloadURL(photoRef);
    }

    // ✅ Grab user info from Zustand or prop
    const userId = userInfo?.uid || userInfo?.id || null;
    const userName =
      `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`.trim() ||
      "Unknown User";
    const userPhoto = userInfo?.photoURL || userInfo?.photo || "";

    // ✅ Write to Firestore
    await setDoc(reportRef, {
      ...reportData,
      reportedBy: {
        id: userId,
        name: userName,
        photo: userPhoto,
      },
      createdAt: Timestamp.now(),
      status: "saved",
      photoURL,
    });

    console.log("✅ Report saved with user:", userName);
  } catch (error) {
    console.error("❌ Error saving report:", error);
  }
}
