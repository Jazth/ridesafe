import { db } from "@/scripts/firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDoc,
} from "firebase/firestore";
import {
    getDownloadURL,
    getStorage,
    ref as storageRef,
    uploadBytes,
} from "firebase/storage";
import React, { useState } from "react";
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function ReportUser() {
  const router = useRouter();
  const { requestId, mechanicId, userId } = useLocalSearchParams();
  const storage = getStorage();

  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 📸 Pick images
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow gallery access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!res.canceled) {
      setPhotos((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
    }
  };

  // 🔥 Upload to Storage
  const uploadImages = async () => {
    const urls: string[] = [];

    for (const uri of photos) {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileName = `report_${userId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 5)}`;
      const imgRef = storageRef(storage, `user_reports/${fileName}`);

      await uploadBytes(imgRef, blob);
      const downloadURL = await getDownloadURL(imgRef);
      urls.push(downloadURL);
    }

    return urls;
  };

  const submitReport = async () => {
    if (!notes.trim()) {
      Alert.alert("Missing Notes", "Please describe the issue.");
      return;
    }

    if (photos.length === 0) {
      Alert.alert("Missing Photos", "Attach at least one photo as evidence.");
      return;
    }

    setLoading(true);

    try {
      // Validate request exists (optional, same as feedback file)
      const ref = doc(db, "breakdown_requests", requestId as string);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        Alert.alert("Error", "Request not found.");
        setLoading(false);
        return;
      }

      const photoUrls = await uploadImages();

      // Save to mechanic_reports collection
      await addDoc(collection(db, "mechanic_reports"), {
        requestId,
        mechanicId,
        userId,
        notes,
        photos: photoUrls,
        reportedAt: new Date(),
      });

      Alert.alert("Success", "User report submitted.");
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Report User</Text>
        <Text style={styles.subtitle}>Describe what happened and provide evidence.</Text>

        <Text style={styles.label}>Reason / Details</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Explain the issue clearly..."
          value={notes}
          onChangeText={setNotes}
        />

        <Text style={styles.label}>Photos (Evidence)</Text>
        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Add Photos</Text>
        </TouchableOpacity>

        <View style={styles.photoGrid}>
          {photos.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.photo} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.5 }]}
          disabled={loading}
          onPress={submitReport}
        >
          <Text style={styles.submitText}>
            {loading ? "Submitting..." : "Submit Report"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 14 },
  textArea: {
    height: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
  },
  addPhotoBtn: {
    backgroundColor: "#FF5722",
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: "#c62828",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 30,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
});
