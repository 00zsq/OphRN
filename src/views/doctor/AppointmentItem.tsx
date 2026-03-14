import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  item: any;
  onAction: (id: string, action: 'confirmed' | 'rejected') => void;
}

export const AppointmentItem = ({ item, onAction }: Props) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.pName}>{item.patientName}</Text>
        <Text style={styles.date}>{item.time}</Text>
      </View>
      <View style={styles.aptDetail}>
        <Text style={styles.aptType}>{item.type}</Text>
        <Text style={styles.reason}>主诉: {item.reason}</Text>
      </View>

      {item.status === 'pending' ? (
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.miniBtn, styles.btnReject]}
            onPress={() => onAction(item.id, 'rejected')}
          >
            <Text style={styles.miniBtnText}>拒绝</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniBtn, styles.btnConfirm]}
            onPress={() => onAction(item.id, 'confirmed')}
          >
            <Text style={[styles.miniBtnText, { color: '#fff' }]}>
              确认预约
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.statusBadge,
            item.status === 'confirmed' ? styles.bgSuccess : styles.bgGrey,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === 'confirmed' ? '预约已确认' : '预约已拒绝'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  date: { fontSize: 12, color: '#999' },
  aptDetail: { marginBottom: 12 },
  aptType: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  reason: { fontSize: 14, color: '#555' },
  btnRow: { flexDirection: 'row', gap: 10 },
  miniBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnReject: { borderColor: '#dd524d', backgroundColor: '#fff' },
  btnConfirm: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  miniBtnText: { fontSize: 14, color: '#333' },
  statusBadge: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
  },
  bgSuccess: { backgroundColor: '#E8F5E9' },
  bgGrey: { backgroundColor: '#F5F5F5' },
  statusText: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50' },
});
