import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
// TODO: 待接口实现 - 用户数据将从后端接口获取
// import { getCurrentUser, USERS } from '../../data/users';
import { AppToast } from '../../components/Toast';
import { patientApi } from '../../api';

export default function PatientAppointment() {
  const [activeTab, setActiveTab] = useState<'list' | 'mine'>('list');
  const [appointments, setAppointments] = useState<any[]>([]);
  // TODO: 待接口实现 - 医生列表默认值暂时为空数组
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAppointmentData = async () => {
      try {
        const [doctorResult, appointmentResult] = await Promise.all([
          patientApi.doctorInfo(),
          patientApi.appointments(),
        ]);

        const remoteDoctors = Array.isArray(doctorResult.data)
          ? doctorResult.data.map((doctor: any, index: number) => ({
              id: String(doctor.id || doctor.doctorId || index + 1),
              name: doctor.name || doctor.username || `医生 ${index + 1}`,
              specialty: doctor.specialty || doctor.department || '眼科',
              available: doctor.available || ['周一上午', '周三下午'],
            }))
          : [];

        const remoteAppointments = Array.isArray(appointmentResult.data)
          ? appointmentResult.data.map((apt: any) => ({
              id: String(apt.id),
              docName: apt.doctorName || `医生 ${apt.doctorId || ''}`.trim(),
              specialty: apt.specialty || '眼科',
              time: apt.appointmentTime || apt.createTime || '-',
              status:
                apt.status === 'CONFIRMED'
                  ? '已确认'
                  : apt.status === 'CANCELLED'
                  ? '已取消'
                  : '待确认',
            }))
          : [];

        if (!cancelled) {
          if (remoteDoctors.length) setDoctors(remoteDoctors);
          if (remoteAppointments.length) setAppointments(remoteAppointments);
        }
      } catch (error) {
        console.warn('Load appointment data failed:', error);
      }
    };

    loadAppointmentData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleBook = (doctor: any, time: string) => {
    AppToast.alert('确认预约', `您确定要预约 ${doctor.name} (${time}) 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: async () => {
          // TODO: 待接口实现 - getCurrentUser 将从后端获取或使用本地存储
          const currentUser: any = {};
          const newAppt = {
            id: Date.now().toString(),
            docName: doctor.name,
            specialty: doctor.specialty,
            time: time,
            status: '待确认',
          };

          try {
            await patientApi.createAppointment({
              patientId: Number(currentUser.patientId || currentUser.userId),
              doctorId: Number(doctor.id),
              appointmentTime: time,
              status: 'PENDING',
            });
          } catch (error) {
            console.warn('Create appointment failed:', error);
          }

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
        onPress: async () => {
          const numericId = Number(id);
          if (!Number.isNaN(numericId)) {
            try {
              await patientApi.updateAppointment({
                id: numericId,
                status: 'CANCELLED',
              });
            } catch (error) {
              console.warn('Cancel appointment failed:', error);
            }
          }

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
