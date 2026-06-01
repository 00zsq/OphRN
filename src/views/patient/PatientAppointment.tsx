import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { AppToast } from '../../components/Toast';
import { patientApi } from '../../api';

export default function PatientAppointment() {
  const [activeTab, setActiveTab] = useState<'list' | 'mine'>('list');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

  const loadAppointmentData = async (showError = true) => {
    try {
      const [doctorResult, appointmentResult] = await Promise.all([
        patientApi.doctorInfo(),
        patientApi.appointments(),
      ]);

      const doctorList = Array.isArray(doctorResult.data)
        ? doctorResult.data.map((doctor: any, index: number) => ({
            id: String(doctor.id || doctor.doctorId || index + 1),
            name: doctor.name || doctor.username,
            email: doctor.email || '',
            status: doctor.status,
            createTime: doctor.createTime,
          }))
        : [];

      const remoteAppointments = Array.isArray(appointmentResult.data)
        ? appointmentResult.data.map((apt: any) => {
            const doctor = doctorList.find(item => Number(item.id) === Number(apt.doctorId));
            return {
              id: String(apt.id),
              doctorId: String(apt.doctorId || ''),
              docName: doctor?.name || '',
              time: apt.appointmentTime || '-',
              rawStatus: apt.status,
              status:
                apt.status === 'CONFIRMED'
                  ? '已确认'
                  : apt.status === 'CANCELLED'
                  ? '已取消'
                  : '待确认',
              confirmTime: apt.confirmTime,
              cancelTime: apt.cancelTime,
              createTime: apt.createTime,
            };
          })
        : [];

      setDoctors(doctorList);
      setAppointments(remoteAppointments);
    } catch (error) {
      console.warn('Load appointment data failed:', error);
      if (showError) {
        AppToast.show('预约数据加载失败', 'error');
      }
    }
  };

  useEffect(() => {
    loadAppointmentData(false);
  }, []);

  const parseAppointmentDate = (time?: string) => {
    if (!time || time === '-') return new Date();

    const parsed = new Date(time.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const openBookModal = (doctor: any) => {
    setSelectedDoctor(doctor);
    setEditingAppointment(null);
    setTimePickerDate(new Date());
    setTimePickerVisible(true);
  };

  const openEditModal = (appointment: any) => {
    setSelectedDoctor(null);
    setEditingAppointment(appointment);
    setTimePickerDate(parseAppointmentDate(appointment.time));
    setTimePickerVisible(true);
  };

  const closeTimePicker = () => {
    setTimePickerVisible(false);
    setSelectedDoctor(null);
    setEditingAppointment(null);
  };

  const formatAppointmentTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  const handleConfirmAppointmentTime = async (date: Date) => {
    const appointmentTime = formatAppointmentTime(date);

    try {
      if (editingAppointment) {
        await patientApi.updateAppointment({
          id: Number(editingAppointment.id),
          appointmentTime,
          status: editingAppointment.rawStatus || 'PENDING',
        });
        AppToast.show('预约时间已修改', 'success');
      } else if (selectedDoctor) {
        await patientApi.createAppointment({
          doctorId: Number(selectedDoctor.id),
          appointmentTime,
        });
        AppToast.show('预约请求已发送', 'success');
      }

      closeTimePicker();
      await loadAppointmentData();
      setActiveTab('mine');
    } catch (error) {
      console.warn('Save appointment failed:', error);
      AppToast.show('预约保存失败', 'error');
    }
  };

  const handleCancel = (id: string) => {
    AppToast.alert('取消预约', '确定要取消吗？', [
      { text: '不', style: 'cancel' },
      {
        text: '是的',
        style: 'destructive',
        onPress: async () => {
          const numericId = Number(id);
          if (Number.isNaN(numericId)) return;

          try {
            await patientApi.updateAppointment({
              id: numericId,
              status: 'CANCELLED',
            });
            await loadAppointmentData();
            AppToast.show('预约已取消', 'info');
          } catch (error) {
            console.warn('Cancel appointment failed:', error);
            AppToast.show('取消预约失败', 'error');
          }
        },
      },
    ]);
  };

  const renderDoctor = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.docInfo}>
        <Text style={styles.docName}>{item.name}</Text>
        <Text style={styles.docSpec}>ID: {item.id}</Text>
      </View>
      {item.email ? <Text style={styles.info}>邮箱: {item.email}</Text> : null}
      {item.createTime ? <Text style={styles.info}>创建时间: {item.createTime}</Text> : null}
      <TouchableOpacity style={styles.btnPrimary} onPress={() => openBookModal(item)}>
        <Text style={styles.btnPrimaryText}>选择时间预约</Text>
      </TouchableOpacity>
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
      <Text style={styles.info}>医生 ID: {item.doctorId || '-'}</Text>
      <Text style={styles.info}>预约时间: {item.time}</Text>
      {item.createTime ? <Text style={styles.info}>创建时间: {item.createTime}</Text> : null}
      {item.confirmTime ? <Text style={styles.info}>确认时间: {item.confirmTime}</Text> : null}
      {item.cancelTime ? <Text style={styles.info}>取消时间: {item.cancelTime}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => openEditModal(item)}
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
          ListEmptyComponent={<Text style={styles.empty}>暂无医生信息</Text>}
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

      <DateTimePickerModal
        isVisible={timePickerVisible}
        mode="datetime"
        locale="zh-CN"
        date={timePickerDate}
        onConfirm={handleConfirmAppointmentTime}
        onCancel={closeTimePicker}
      />
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
  btnPrimary: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  btnPrimaryText: { color: 'white', fontWeight: 'bold' },
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
