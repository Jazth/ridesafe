import { useUserProfileStore } from "@/constants/userProfileStore";
import { db, storage } from "@/scripts/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, doc, getDoc, getDocs, query, Timestamp, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BreakdownRequest } from "@/constants/callForHelp";
import { useUserQueryLoginStore } from "@/constants/store";

export default function ReportUser() {
  const { requestId } = useLocalSearchParams();
const { currentUser } = useUserQueryLoginStore();
const { userInfo } = useUserProfileStore();

// Retrieve mechanic ID
const mechanicId = userInfo?.id || currentUser?.id || "unknown";
console.log("Mechanic ID:", mechanicId);
const fetchServiceNotes = async (requestId: string) => {
  const q = query(collection(db, "service_notes"), where("requestId", "==", requestId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
};
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceImages, setServiceImages] = useState<string[]>([]);

  const pickServiceImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setServiceImages([...serviceImages, ...result.assets.map(a => a.uri)]);
    }
  };
const [selectedRequest, setSelectedRequest] = useState<BreakdownRequest & { service_notes?: any } | null>(null);

const handleSelectRequest = async (req: BreakdownRequest) => {
  const notes = await fetchServiceNotes(req.id!);
  setSelectedRequest({ ...req, service_notes: notes.length > 0 ? notes[0] : null });
};

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProofImage(result.assets[0].uri);
    }
  };

  const handleReasonPress = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };
  const handleSubmitReport = async () => {
  if (selectedReasons.length === 0) {
    Alert.alert("Missing Information", "Please select at least one reason for reporting.");
    return;
  }

  try {
    setLoading(true);

    // Upload proof image if selected
    let proofImageUrl: string | null = null;
    if (proofImage) {
      const response = await fetch(proofImage);
      const blob = await response.blob();
      const storageRef = ref(storage, `reports/${userInfo?.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      proofImageUrl = await getDownloadURL(storageRef);
    }
 let reportedUserEmail = "N/A";
    if (request?.userId) {
      const userRef = doc(db, "users", request.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        reportedUserEmail = userSnap.data().email || "N/A";
      }
    }
    // reportedTo should be the user in the breakdown request
    const reportedTo = request?.userId
      ? { id: request.userId, name: request.userName || "N/A", email: reportedUserEmail, }
      : null;

    const reportData = {
      reportedBy: {
        id: userInfo?.id || currentUser?.id || "unknown", // mechanic reporting
        name: `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`.trim() || "Anonymous",
        email: userInfo?.email || "N/A",
        role: userInfo?.role || "mechanic",
      },
      reportedTo, // now correctly points to the user
      breakdownRequest: {
        id: request.id,
        address: request.address,
        reason: request.reason,
        vehicle: request.vehicle || null,
        status: request.status,
      },
      reportReasons: selectedReasons,
      description: reportText || "No additional details provided.",
      proofImageUrl,
      createdAt: Timestamp.now(),
      status: "pending",
      
targetType: "user",

    };

    await addDoc(collection(db, "reports"), reportData);

    Alert.alert("Report Submitted", "Your report has been successfully recorded.");
    setReportVisible(false);
    setSelectedReasons([]);
    setReportText("");
    setProofImage(null);
  } catch (error) {
    console.error("Error submitting report:", error);
    Alert.alert(" Error", "Something went wrong while submitting your report.");
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const refDoc = doc(db, "breakdown_requests", requestId as string);
        const snap = await getDoc(refDoc);
        if (snap.exists()) setRequest({ id: snap.id, ...snap.data() });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [requestId]);

  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <ActivityIndicator size="large" style={{ flex: 1, marginTop: 50 }} color="#FF5722" />
      </SafeAreaView>
    );

  if (!request)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>Request not found.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white", paddingTop: 50 }}>
      {/* Header with only Report Icon */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => setReportVisible(true)} style={{ padding: 10 }}>
          <Ionicons name="alert-circle-outline" size={28} color="#FF5722" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Request Details */}
        <View style={{ backgroundColor: "#FAFAFA", borderRadius: 12, padding: 20, flex: 1, marginBottom: 30 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10, color: "#333" }}>Request Details</Text>
          <Text style={styles.detailText}>📍 Address: {request.address}</Text>
          <Text style={styles.detailText}>
            🚗 Vehicle: {request.vehicle?.make} {request.vehicle?.model} ({request.vehicle?.year})
          </Text>
          <Text style={styles.detailText}>⚙️ Reason: {request.reason}</Text>
        </View>

        {/* User Details */}
        {request.userId && (
          <View style={{ backgroundColor: "#FFF3E0", borderRadius: 12, padding: 20, marginBottom: 30 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 10, color: "#FF5722" }}>User Details</Text>
            <Text style={styles.detailText}>👤 Name: {request.userName || "N/A"}</Text>
            <Text style={styles.detailText}>📞 Phone: {request.phoneNum || "N/A"}</Text>
          </View>
        )}

        {/* Service Notes Input */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Service Notes</Text>
          <TextInput
            placeholder="Describe the work you did..."
            value={serviceNotes}
            onChangeText={setServiceNotes}
            multiline
            style={{
              borderColor: "#ccc",
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
              height: 120,
              textAlignVertical: "top",
              marginBottom: 10,
            }}
          />
          <TouchableOpacity
            onPress={pickServiceImages}
            style={{ backgroundColor: "#FF5722", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 10 }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              {serviceImages.length > 0 ? "Add/Change Photos" : "Upload Proof Photos"}
            </Text>
          </TouchableOpacity>
          <ScrollView horizontal style={{ marginBottom: 10 }}>
            {serviceImages.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={{ width: 120, height: 120, marginRight: 10, borderRadius: 8 }} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Done Feedback Button */}
      <TouchableOpacity
  onPress={async () => {
    try {
      setLoading(true);

      const uploadedImages = await Promise.all(
        serviceImages.map(async (uri) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          const storageRef = ref(
            storage,
            `service_notes/${mechanicId}_${Date.now()}_${Math.random()}.jpg`
          );
          await uploadBytes(storageRef, blob);
          return getDownloadURL(storageRef);
        })
      );

      await addDoc(collection(db, "service_notes"), {
        requestId: request.id,
        mechanicId,
        notes: serviceNotes,
        images: uploadedImages,
        createdAt: Timestamp.now(),
      });

      Alert.alert(" Feedback Submitted", "Your service notes have been saved.", [
        {
          text: "OK",
          onPress: () => router.replace("/mechanic/mechanicDashboard"), // Redirect to homepage
        },
      ]);

      setServiceNotes("");
      setServiceImages([]);
    } catch (err) {
      console.error(err);
      Alert.alert(" Error", "Failed to save service feedback.");
    } finally {
      setLoading(false);
    }
  }}
  style={{
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  }}
>
  <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Done Feedback</Text>
</TouchableOpacity>

      {/* Report Modal */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, minHeight: 550 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#FF5722", marginBottom: 15 }}>Report Breakdown Request</Text>

            {[
              "User claimed repair not done properly",
              "User complained about overpriced service",
              "User was unprofessional or rude",
              "User engaged in verbal harassment",
              "User sent inappropriate messages",
              "User caused delays",
              "User prevented mechanic from completing repair",
            ].map((reason) => (
              <Pressable
                key={reason}
                onPress={() => handleReasonPress(reason)}
                style={{
                  backgroundColor: selectedReasons.includes(reason) ? "#FF5722" : "white",
                  paddingVertical: 10,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: selectedReasons.includes(reason) ? "white" : "#333", fontWeight: selectedReasons.includes(reason) ? "bold" : "normal" }}>
                  {reason}
                </Text>
              </Pressable>
            ))}

            <TextInput
              placeholder="Add more details or justification..."
              value={reportText}
              onChangeText={setReportText}
              multiline
              style={{ borderColor: "#ccc", borderWidth: 1, borderRadius: 8, marginTop: 10, padding: 10, height: 80, textAlignVertical: "top" }}
            />

            <TouchableOpacity onPress={pickImage} style={{ backgroundColor: "#FFE0CC", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 10 }}>
              <Text style={{ color: "#FF5722", fontWeight: "bold" }}>{proofImage ? "Change Proof Photo" : "Upload Proof Photo"}</Text>
            </TouchableOpacity>

            {proofImage && <Image source={{ uri: proofImage }} style={{ width: "100%", height: 150, borderRadius: 8, marginTop: 10 }} resizeMode="cover" />}

            <Pressable onPress={handleSubmitReport} style={{ backgroundColor: "#FF5722", marginTop: 25, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Submit Report</Text>
            </Pressable>

            <Pressable onPress={() => setReportVisible(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: "#FF5722", fontWeight: "bold", fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = {
  detailText: {
    fontSize: 16,
    color: "#444",
    marginBottom: 6,
  },
};
