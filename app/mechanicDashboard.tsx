import { useBreakdownStore } from '@/constants/callForHelp';
import React from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function MechanicDashboard() {
  const requests = useBreakdownStore((state) => state.requests);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Incoming Breakdown Requests</Text>
      {requests.length === 0 ? (
        <Text style={styles.empty}>No requests yet</Text>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={styles.card}>
            <Text style={styles.cardTitle}>Request ID: {req.id}</Text>
            <Text>Address: {req.address}</Text>
            <Text>Reason: {req.reason}</Text>
            <Text>Time: {new Date(req.timestamp).toLocaleString()}</Text>
            <Button title="View on Map" onPress={() => {}} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  empty: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
});
