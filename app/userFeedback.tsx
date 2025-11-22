import { useUserQueryLoginStore } from '@/constants/store'; // <-- added
import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function UserFeedback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params.requestId as string;

  const { currentUser } = useUserQueryLoginStore();  // <-- get current logged-in user (NO AUTH)

  const [mechanicInfo, setMechanicInfo] = useState<{
    id: string;
    name: string;
    email?: string;
    profilePictureUrl?: string;
  }>({
    id: '',
    name: 'Mechanic',
  });

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!requestId) return;

    const fetchMechanicInfo = async () => {
      try {
        const requestRef = doc(db, 'breakdown_requests', requestId);
        const docSnap = await getDoc(requestRef);

        if (!docSnap.exists()) {
          Alert.alert('Error', 'Request not found.');
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        const claimedById = data.claimedBy?.id;
        const claimedByName = data.claimedBy?.name || 'Mechanic';
        const claimedByEmail = data.claimedBy?.email;

        let profilePictureUrl: string | undefined;
        if (claimedById) {
          const userDoc = await getDoc(doc(db, 'users', claimedById));
          if (userDoc.exists()) {
            profilePictureUrl = userDoc.data().profilePictureUrl;
          }
        }

        setMechanicInfo({
          id: claimedById || 'unknown',
          name: claimedByName,
          email: claimedByEmail,
          profilePictureUrl,
        });
      } catch (err) {
        console.error('Error fetching mechanic info:', err);
        Alert.alert('Error', 'Failed to fetch mechanic info.');
      } finally {
        setLoading(false);
      }
    };

    fetchMechanicInfo();
  }, [requestId]);

  const submitFeedback = async () => {
    if (!requestId) return;

    if (!currentUser?.id) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    if (rating === 0) {
      Alert.alert('Validation', 'Please provide a rating.');
      return;
    }

    try {
      await addDoc(collection(db, 'mechanic_feedback'), {
        requestId,
        mechanic: {
          id: mechanicInfo.id,
          name: mechanicInfo.name,
          email: mechanicInfo.email || '',
          profilePictureUrl: mechanicInfo.profilePictureUrl || '',
        },
        user: {
            id: currentUser.id,
            name: currentUser.firstName + " " + currentUser.lastName,
        },
        rating,
        comment: comment || '',
        createdAt: Timestamp.now(),
      });

      Alert.alert('Thank you!', 'Your feedback has been submitted.', [
        {
          text: 'OK',
          onPress: () => router.replace('/user/Discover'),
        },
      ]);

      setRating(0);
      setComment('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mechanicInfo.profilePictureUrl && (
        <Image source={{ uri: mechanicInfo.profilePictureUrl }} style={styles.profileImage} />
      )}

      <Text style={styles.title}>Rate {mechanicInfo.name}</Text>

      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color="#FFD700"
              style={{ marginHorizontal: 4 }}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Write a comment (optional)"
        multiline
        value={comment}
        onChangeText={setComment}
      />

      <TouchableOpacity style={styles.submitButton} onPress={submitFeedback}>
        <Text style={styles.submitButtonText}>Submit Feedback</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 25,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
