import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { USERS } from '../../data/users';
import { AppToast } from '../../components/Toast';

export default function PatientAppointment() {
  const [activeTab, setActiveTab] = useState<'list' | 'mine'>('list');
  const [appointments, setAppointments] = useState<any[]>([]);

  // 模拟医生列表
  const doctors = USERS.doctor_list || [];

  const handleBook = (doctor: any, time: string) => {
    AppToast.alert('确认预约', `您确定要预约 ${doctor.name} (${time}) 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: () => {
          const newAppt = {
            id: Date.now().toString(),
            docName: doctor.name,
            specialty: doctor.specialty,
            time: time,
            status: '待确认',
          };
          setAppointments([...appointments, newAppt]);
          AppToast.show('预约请求已发送', 'success');
          setActiveTab('mine');
        },
      },
    ]);
  };

  const handleCancel = (id: string) => {
    AppToast.alert('取消预约', '确定要取消吗？', [
      { text: '不', style: 'cancel' },
      {
        text: '是的',
        style: 'destructive',
        onPress: () => {
          setAppointments(appointments.filter(a => a.id !== id));
          AppToast.show('预约已取消', 'info');
        },
      },
    ]);
  };

  const renderDoctor = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.docInfo}>
        <Text style={styles.docName}>{item.name}</Text>
        <Text style={styles.docSpec}>{item.specialty}</Text>
      </View>
      <View style={styles.timesContainer}>
        {item.available.map((time: string, idx: number) => (
          <TouchableOpacity
            key={idx}
            style={styles.timeTag}
            onPress={() => handleBook(item, time)}
          >
            <Text style={styles.timeText}>{time}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMyAppt = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.docName}>{item.docName}</Text>
        <Text
          style={[
            styles.status,
            { color: item.status === '待确认' ? '#FF9800' : 'green' },
          ]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.info}>科室: {item.specialty}</Text>
      <Text style={styles.info}>时间: {item.time}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => AppToast.show('修改功能开发中', 'info')}
        >
          <Text>修改</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: 'red' }]}
          onPress={() => handleCancel(item.id)}
        >
          <Text style={{ color: 'red' }}>取消</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'list' && styles.activeTabText,
            ]}
          >
            预约专家
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mine' && styles.activeTab]}
          onPress={() => setActiveTab('mine')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'mine' && styles.activeTabText,
            ]}
          >
            我的预约
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'list' ? (
        <FlatList
          data={doctors}
          keyExtractor={item => item.id}
          renderItem={renderDoctor}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={renderMyAppt}
          ListEmptyComponent={<Text style={styles.empty}>暂无预约记录</Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2196F3' },
  tabText: { color: '#666', fontSize: 16 },
  activeTabText: { color: '#2196F3', fontWeight: 'bold' },
  list: { padding: 15 },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  docInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  docName: { fontSize: 18, fontWeight: 'bold' },
  docSpec: {
    color: '#666',
    fontSize: 14,
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  timesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeTag: { backgroundColor: '#E3F2FD', padding: 8, borderRadius: 5 },
  timeText: { color: '#2196F3', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  status: { fontWeight: 'bold' },
  info: { color: '#555', marginBottom: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
});
