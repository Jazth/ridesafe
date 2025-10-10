// ✅ MechanicHistory.tsx
import type { BreakdownRequest } from '@/constants/callForHelp';
import { useUserQueryLoginStore } from '@/constants/store';
import { db } from '@/scripts/firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MechanicHistory() {
  const { currentUser } = useUserQueryLoginStore();
  const mechanicId = currentUser?.id;

  const [history, setHistory] = useState<BreakdownRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BreakdownRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ Listen for all requests handled by this mechanic
  useEffect(() => {
    if (!mechanicId) return;

    const q = query(collection(db, 'breakdown_requests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BreakdownRequest[];

      // only requests this mechanic handled
      const myRequests = all.filter(
        (r) => r.claimedBy?.id === mechanicId || r.cancelledBy === mechanicId
      );

      // sort by date descending
      const sorted = myRequests.sort(
        (a, b) =>
          new Date(b.timestamp?.toDate?.() ?? b.timestamp).getTime() -
          new Date(a.timestamp?.toDate?.() ?? a.timestamp).getTime()
      );

      setHistory(sorted);
    });

    return () => unsubscribe();
  }, [mechanicId]);

  // ✅ Map status to color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#4CAF50'; // green
      case 'cancelled':
        return '#E53935'; // red
      case 'pending':
        return '#FFC107'; // yellow
      case 'claimed':
        return '#9C27B0'; // purple
      default:
        return '#555';
    }
  };

  const renderRequestCard = (req: BreakdownRequest) => {
    const color = getStatusColor(req.status);
    return (
      <TouchableOpacity
        key={req.id}
        style={[styles.card, { borderLeftColor: color }]}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedRequest(req);
          setModalVisible(true);
        }}
      >
        <Text style={styles.address}>{req.address}</Text>
        <Text style={styles.reason}>Reason: {req.reason}</Text>
        <Text style={styles.timestamp}>
          {req.timestamp?.toDate
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()}
        </Text>
        <Text style={[styles.status, { color }]}>{req.status.toUpperCase()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Breakdown Request History</Text>

        {history.length > 0 ? (
          history.map((req) => renderRequestCard(req))
        ) : (
          <Text style={styles.empty}>No history records yet</Text>
        )}
      </ScrollView>

      {/* Modal for details */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {selectedRequest ? (
              <>
                <Text style={styles.modalTitle}>Request Details</Text>

                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Name:</Text>{' '}
                  {selectedRequest.userName || 'Unknown User'}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Phone:</Text>{' '}
                  {selectedRequest.phoneNum || 'N/A'}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Address:</Text>{' '}
                  {selectedRequest.address || 'Unknown Address'}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Reason:</Text>{' '}
                  {selectedRequest.reason || 'N/A'}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Status:</Text>{' '}
                  {selectedRequest.status.toUpperCase()}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.bold}>Requested On:</Text>{' '}
                  {selectedRequest.timestamp?.toDate
                    ? selectedRequest.timestamp.toDate().toLocaleString()
                    : new Date(selectedRequest.timestamp).toLocaleString()}
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text>No details available</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FF5722',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  address: { fontSize: 18, fontWeight: '600', marginBottom: 6, color: '#222' },
  reason: { fontSize: 16, color: '#555', marginBottom: 4 },
  timestamp: { fontSize: 14, color: '#999', marginBottom: 4 },
  status: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  empty: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FF5722',
  },
  modalText: { fontSize: 16, marginBottom: 8, color: '#333' },
  bold: { fontWeight: '700', color: '#FF5722' },
  closeButton: {
    marginTop: 25,
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
