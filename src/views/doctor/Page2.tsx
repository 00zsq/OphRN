import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { USERS } from '../../data/users';
import { DIAGNOSIS_RESULTS_LIST } from '../../data/mockData';
import { AppToast } from '../../components/Toast';

// 引入拆分的组件
import { DiagnosisItem } from './DiagnosisItem';
import { AppointmentItem } from './AppointmentItem';
import { ReviewModal } from './ReviewModal';

// 模拟眼底图像资源
const MOCK_IMAGES = [
  require('../../data/left.jpg'),
  require('../../data/right.jpg'),
];

export default function Page2() {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'appointment'>(
    'diagnosis',
  );

  // --- 场景一数据 ---
  const [diagnosisQueue, setDiagnosisQueue] = useState(() => {
    return USERS.patients.map((patient, index) => {
      const diagnosis =
        DIAGNOSIS_RESULTS_LIST[index % DIAGNOSIS_RESULTS_LIST.length];
      return {
        id: `diag_${index}`,
        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        date: '2025-05-20 09:30',
        image: MOCK_IMAGES[index % MOCK_IMAGES.length],
        aiResult: diagnosis,
        status: 'pending' as 'pending' | 'reviewed',
        doctorAdvice: '',
        nextStep: '',
      };
    });
  });

  // --- 场景二数据 ---
  const [appointments, setAppointments] = useState([
    {
      id: 'apt_1',
      patientName: USERS.patients[0].name,
      time: '2025-05-22 09:00',
      type: '专家门诊',
      reason: '青光眼术后复查',
      status: 'pending' as 'pending' | 'confirmed' | 'rejected',
    },
    {
      id: 'apt_2',
      patientName: USERS.patients[1].name,
      time: '2025-05-23 14:30',
      type: '普通门诊',
      reason: '白内障咨询',
      status: 'pending' as 'pending' | 'confirmed' | 'rejected',
    },
  ]);

  // --- Modal 状态 ---
  const [modalVisible, setModalVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<any>(null);

  // 1. 审核逻辑
  const openReviewModal = (item: any) => {
    setCurrentReview(item);
    setModalVisible(true);
  };

  const handleSaveReview = (id: string, advice: string, nextStep: string) => {
    const updatedQueue = diagnosisQueue.map(item =>
      item.id === id
        ? {
            ...item,
            status: 'reviewed',
            doctorAdvice: advice,
            nextStep: nextStep,
          }
        : item,
    );
    setDiagnosisQueue(updatedQueue as any);
    setModalVisible(false);
    AppToast.show('审核报告已保存并发送给患者', 'success');
  };

  // 2. 预约逻辑
  const handleAppointment = (id: string, action: 'confirmed' | 'rejected') => {
    const updated = appointments.map(apt =>
      apt.id === id ? { ...apt, status: action } : apt,
    );
    setAppointments(updated as any);
    AppToast.show(
      action === 'confirmed' ? '已确认预约' : '已拒绝预约',
      action === 'confirmed' ? 'success' : 'info',
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部 Tab */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'diagnosis' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('diagnosis')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'diagnosis' && styles.tabTextActive,
            ]}
          >
            AI 诊断审核 (
            {diagnosisQueue.filter(i => i.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'appointment' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('appointment')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'appointment' && styles.tabTextActive,
            ]}
          >
            患者预约管理 (
            {appointments.filter(i => i.status === 'pending').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <View style={styles.content}>
        {activeTab === 'diagnosis' ? (
          <FlatList
            data={diagnosisQueue}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <DiagnosisItem item={item} onReviewPress={openReviewModal} />
            )}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<Text style={styles.empty}>无待审核记录</Text>}
          />
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <AppointmentItem item={item} onAction={handleAppointment} />
            )}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<Text style={styles.empty}>无预约申请</Text>}
          />
        )}
      </View>

      {/* 审核弹窗 */}
      <ReviewModal
        visible={modalVisible}
        data={currentReview}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#007AFF' },
  tabText: { fontSize: 16, color: '#666' },
  tabTextActive: { color: '#007AFF', fontWeight: 'bold' },
  content: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
