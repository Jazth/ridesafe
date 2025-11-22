import { useUserQueryLoginStore } from "@/constants/store";
import { db } from "@/scripts/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router"; // <- Import router

export default function MechanicViewRating() {
  const router = useRouter();
  const { currentUser } = useUserQueryLoginStore();
  const mechanicId = currentUser?.id;

  interface MechanicFeedback {
    id: string;
    rating: number;
    comment?: string;
    createdAt?: { toDate: () => Date };
  }

  const [feedback, setFeedback] = useState<MechanicFeedback[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (!mechanicId) return;

    const q = query(
      collection(db, "mechanic_feedback"),
      where("mechanic.id", "==", mechanicId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all: MechanicFeedback[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<MechanicFeedback, "id">),
      }));

      setFeedback(all);

      const avg = all.length
        ? all.reduce((sum, f) => sum + (f.rating || 0), 0) / all.length
        : 0;

      setAverageRating(avg);
    });

    return () => unsubscribe();
  }, [mechanicId]);

  const renderStars = (count: number) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Ionicons
            key={i}
            name={i <= count ? "star" : "star-outline"}
            size={20}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Your Mechanic Rating</Text>

        <View style={styles.averageContainer}>
          <Text style={styles.averageText}>{averageRating.toFixed(1)}</Text>
          {renderStars(Math.round(averageRating))}
          <Text style={styles.subText}>
            Based on {feedback.length} feedback(s)
          </Text>
        </View>

        <FlatList
          data={feedback}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {renderStars(item.rating)}
              <Text style={styles.comment}>
                {item.comment ? item.comment : "No comment provided"}
              </Text>
              <Text style={styles.date}>
                {item.createdAt?.toDate?.().toLocaleString() || ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "#555" }}>
              No feedback yet.
            </Text>
          }
        />
      </View>

      {/* Floating Back Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  averageContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  averageText: {
    fontSize: 48,
    fontWeight: "800",
  },
  subText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  comment: {
    marginTop: 8,
    fontSize: 16,
  },
  date: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },
  floatingButton: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#FF5722",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
