import { useUserQueryLoginStore } from '@/constants/store';
import { db } from "@/scripts/firebaseConfig";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Notification {
  id: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  type: string;
  message: string;
  createdAt: Timestamp;
  read?: boolean;
}

export default function MechanicNotifications() {
  const { currentUser } = useUserQueryLoginStore();
  const mechanicId = currentUser?.id; // get mechanic ID from store

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!mechanicId) return;

    const q = query(
      collection(db, "mechanic_system_notifications"),
      where("receiverId", "==", mechanicId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => {
          const notif = docSnap.data() as Notification;
          return {
            id: docSnap.id,
            ...notif,
            createdAt: notif.createdAt || Timestamp.now(),
          };
        })
        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

      setNotifications(data);
    });

    return () => unsubscribe();
  }, [mechanicId]);

  const markAsRead = async (notifId: string) => {
    try {
      const notifRef = doc(db, "mechanic_system_notifications", notifId);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>Notifications</Text>

        {notifications.length === 0 ? (
          <Text style={styles.noNotifText}>No notifications yet.</Text>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.card,
                  !item.read && {
                    backgroundColor: "#FFF3E0",
                    borderColor: "#FF5722",
                  },
                ]}
                onPress={() => markAsRead(item.id)}
              >
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
                {!item.read && (
                  <Text style={styles.markRead}>Tap to mark as read</Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/mechanic/mechanic_history')}
        >
          <Text style={styles.backButtonText}>Back to History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  header: { fontSize: 22, fontWeight: "700", color: "#FF5722", marginBottom: 16, textAlign: "center" },
  noNotifText: { textAlign: "center", color: "#999", fontSize: 16, marginTop: 30 },
  card: { backgroundColor: "#FFFFFF", padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#E0E0E0" },
  message: { fontSize: 15, color: "#333", marginBottom: 6 },
  time: { fontSize: 12, color: "#888" },
  markRead: { marginTop: 6, fontSize: 12, color: "#FF5722", fontWeight: "600" },
  backButton: { position: "absolute", right: 16, bottom: 70, backgroundColor: "#FF5722", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
  backButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
