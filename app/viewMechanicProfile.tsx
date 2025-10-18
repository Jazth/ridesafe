import { BreakdownRequest } from "@/constants/callForHelp";
import { useUserProfileStore } from "@/constants/userProfileStore";
import { db, storage } from "@/scripts/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
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
  
export default function ViewMechanicProfile() {
  const { requestId } = useLocalSearchParams();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const { userInfo } = useUserProfileStore();

 useEffect(() => {
  const fetchRequest = async () => {
    try {
      const ref = doc(
        db,
        "breakdown_requests",
        Array.isArray(requestId) ? requestId[0] : requestId
      );
      const snap = await getDoc(ref);
      if (snap.exists()) {
        // Type the request data
        const requestData = snap.data() as BreakdownRequest;
        requestData.id = snap.id;

        // If claimedBy exists, fetch mechanic info
        if (requestData.claimedBy?.id) {
          const mechanicRef = doc(db, "mechanics", requestData.claimedBy.id);
          const mechanicSnap = await getDoc(mechanicRef);
          if (mechanicSnap.exists()) {
            requestData.claimedBy = {
              ...requestData.claimedBy,
              ...mechanicSnap.data(),
            };
          }
        }

        setRequest(requestData);
      }
    } catch (error) {
      console.error("Error loading request:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchRequest();
}, [requestId]);



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
  
const handleSubmitReport = async () => {
  if (!selectedReason) {
    Alert.alert("Missing Information", "Please select a reason for reporting.");
    return;
  }

  try {
    setLoading(true);

    let proofImageUrl: string | null = null;

    // ✅ Upload image proof to Firebase Storage (if attached)
    if (proofImage) {
      const response = await fetch(proofImage);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        `reports/${userInfo?.id}_${Date.now()}.jpg`
      );

      await uploadBytes(storageRef, blob);
      proofImageUrl = await getDownloadURL(storageRef);
    }

    // ✅ Prepare Firestore data
    // ✅ Prepare Firestore data
const reportData = {
  reportedBy: {
    id: userInfo?.id || "unknown",
    name: `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`.trim() || "Anonymous",
    email: userInfo?.email || "N/A",
    role: userInfo?.role || "user",
  },

  reportedTo: request.claimedBy
    ? {
        id: request.claimedBy.id,
        name: request.claimedBy.name || "N/A",
      }
    : null,

  breakdownRequest: {
    id: request.id,
    userId: request.userId,
    address: request.address,
    reason: request.reason,
    status: request.status,
    vehicle: request.vehicle || null,
  },

  reportReason: selectedReason,
  description: reportText || "No additional details provided.",
  proofImageUrl: proofImageUrl || null,
  createdAt: Timestamp.now(),
  status: "pending",
};


    // ✅ Save to Firestore
    await addDoc(collection(db, "reports"), reportData);

    Alert.alert(
      "✅ Report Submitted",
      "Your report has been successfully recorded."
    );

    setReportVisible(false);
    setSelectedReason(null);
    setReportText("");
    setProofImage(null);
  } catch (error) {
    console.error("Error submitting report:", error);
    Alert.alert("❌ Error", "Something went wrong while submitting your report.");
  } finally {
    setLoading(false);
  }
};



  if (loading)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <ActivityIndicator
          size="large"
          style={{ flex: 1, marginTop: 50 }}
          color="#FF5722"
        />
      </SafeAreaView>
    );

  if (!request)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          Request not found.
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "white",
        paddingTop: 50,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 🔙 Back Button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FF5722",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 10,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                marginLeft: 8,
                fontSize: 16,
              }}
            >
              Back to History
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🔧 Mechanic Section */}
        <View
          style={{
            backgroundColor: "#FFF3E0",
            borderRadius: 12,
            padding: 20,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 12,
              color: "#FF5722",
            }}
          >
            Mechanic Details
          </Text>

          {request.claimedBy ? (
     <>
                <Text style={styles.detailText}>
                👨‍🔧 Name: {request.claimedBy.name || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                📞 Phone: {request.claimedBy.phoneNum || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                🏢 Business: {request.claimedBy.business || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                📍 Address: {request.claimedBy.serviceArea || "N/A"}
                </Text>
            </>
            ) : (
            <Text style={styles.detailText}>No mechanic assigned yet.</Text>
            )}

        </View>
        <View
          style={{
            backgroundColor: "#FAFAFA",
            borderRadius: 12,
            padding: 20,
            flex: 1,
            marginBottom: 30,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              marginBottom: 10,
              color: "#333",
            }}
          >
            Request Details
          </Text>
          <Text style={styles.detailText}>📍 Address: {request.address}</Text>
          <Text style={styles.detailText}>
            🚗 Vehicle: {request.vehicle?.make} {request.vehicle?.model} (
            {request.vehicle?.year})
          </Text>
          <Text style={styles.detailText}>⚙️ Reason: {request.reason}</Text>
          {request.timestamp?.seconds && (
            <Text style={styles.detailText}>
              📅 Date:{" "}
              {new Date(request.timestamp.seconds * 1000).toLocaleString()}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setReportVisible(true)}
          style={{
            backgroundColor: "#FF5722",
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
            Report Request
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 🧾 Report Modal */}
      <Modal
        visible={reportVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 25,
              minHeight: 550,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: "#FF5722",
                marginBottom: 15,
              }}
            >
              Report Breakdown Request
            </Text>
            {[
              "The repair was not done properly",
              "Overpriced service",
              "Unprofessional or rude behavior",
              "Verbal harassment",
              "Inappropriate or unsolicited messages",
              "Mechanic arrived very late without notice",
              "Mechanic did not complete the repair",
            ].map((reason) => (
              <Pressable
                key={reason}
                onPress={() => setSelectedReason(reason)}
                style={{
                  backgroundColor:
                  selectedReason === reason ? "#FF5722" : "white",
                  paddingVertical: 10,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: selectedReason === reason ? "white" : "#333",
                    fontWeight:
                      selectedReason === reason ? "bold" : "normal",
                  }}
                >
                  {reason}
                </Text>
              </Pressable>
            ))}

            {/* Text Input for Explanation */}
            <TextInput
              placeholder="Add more details or justification..."
              value={reportText}
              onChangeText={setReportText}
              multiline
              style={{
                borderColor: "#ccc",
                borderWidth: 1,
                borderRadius: 8,
                marginTop: 10,
                padding: 10,
                height: 80,
                textAlignVertical: "top",
              }}
            />

            {/* Proof Upload */}
            <TouchableOpacity
              onPress={pickImage}
              style={{
                backgroundColor: "#FFE0CC",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text style={{ color: "#FF5722", fontWeight: "bold" }}>
                {proofImage ? "Change Proof Photo" : "Upload Proof Photo"}
              </Text>
            </TouchableOpacity>

            {proofImage && (
              <Image
                source={{ uri: proofImage }}
                style={{
                  width: "100%",
                  height: 150,
                  borderRadius: 8,
                  marginTop: 10,
                }}
                resizeMode="cover"
              />
            )}

            <Pressable
              onPress={handleSubmitReport}
              style={{
                backgroundColor: "#FF5722",
                marginTop: 25,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Submit Report
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setReportVisible(false)}
              style={{
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FF5722",
                  fontWeight: "bold",
                  fontSize: 15,
                }}
              >
                Cancel
              </Text>
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
