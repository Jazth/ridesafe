import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/scripts/firebaseConfig';
import type { BreakdownRequest } from '@/constants/callForHelp';

export default function MechanicHistory() {
  const mechanicId = 'mechanic1'; // TODO: replace with actual logged-in mechanic ID
  const [pending, setPending] = useState<BreakdownRequest[]>([]);
  const [done, setDone] = useState<BreakdownRequest[]>([]);
  const [cancelled, setCancelled] = useState<BreakdownRequest[]>([]);

 useEffect(() => {
  const q = query(collection(db, 'breakdown_requests'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const all = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BreakdownRequest[];

    // Show requests related to this mechanic (claimed or cancelled)
    const myRequests = all.filter(
      (r) => r.claimedBy?.id === mechanicId || r.cancelledBy === mechanicId
    );
    
    // Pending → Claimed but not finished yet
    setPending(myRequests.filter((r) => r.status === 'pending'));

    // Done → Transaction completed
    setDone(myRequests.filter((r) => r.status === 'done'));

    // Cancelled → Mechanic cancelled
    setCancelled(myRequests.filter((r) => r.status === 'cancelled'));
  });

  return () => unsubscribe();
}, []);


  const renderRequestCard = (req: BreakdownRequest, color: string) => (
    <View key={req.id} style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.address}>{req.address}</Text>
      <Text style={styles.reason}>Reason: {req.reason}</Text>
      <Text style={styles.timestamp}>
        {req.timestamp?.toDate
          ? req.timestamp.toDate().toLocaleString()
          : new Date(req.timestamp).toLocaleString()}
      </Text>
      <Text style={[styles.status, { color }]}>{req.status.toUpperCase()}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Breakdown History</Text>

      {/* Pending */}
      <Text style={styles.sectionTitle}>🕓 Ongoing / Pending Requests</Text>
      {pending.length > 0 ? (
        pending.map((req) => renderRequestCard(req, '#f0ad4e'))
      ) : (
        <Text style={styles.empty}>No pending requests</Text>
      )}

      {/* Done */}
      <Text style={styles.sectionTitle}>✅ Completed Requests</Text>
      {done.length > 0 ? (
        done.map((req) => renderRequestCard(req, '#28a745'))
      ) : (
        <Text style={styles.empty}>No completed requests</Text>
      )}

      {/* Cancelled */}
      <Text style={styles.sectionTitle}>❌ Cancelled Requests</Text>
      {cancelled.length > 0 ? (
        cancelled.map((req) => renderRequestCard(req, '#d9534f'))
      ) : (
        <Text style={styles.empty}>No cancelled requests</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
    elevation: 3,
  },
  address: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  reason: { fontSize: 16, color: '#555', marginBottom: 4 },
  timestamp: { fontSize: 14, color: '#888', marginBottom: 4 },
  status: { fontSize: 16, fontWeight: '700' },
  empty: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
  },
});
