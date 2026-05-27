import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { AppToast } from '../../components/Toast';
import { manageApi, reportApi } from '../../api';

// 引入拆分的组件
import { DiagnosisItem } from './DiagnosisItem';
import { AppointmentItem } from './AppointmentItem';
import { ReviewModal } from './ReviewModal';

// TODO: 使用真实数据
const MOCK_IMAGES: any[] = [];

export default function Page2() {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'appointment'>(
    'diagnosis',
  );

  // --- 场景一数据 ---
  const [diagnosisQueue, setDiagnosisQueue] = useState(() => {
    // TODO: 使用真实数据
    return [];
  });

  // --- 场景二数据 ---
  const [appointments, setAppointments] = useState([
    {
      id: 'apt_1',
      patientName: 'ct', // TODO: 使用真实数据
      time: '2025-05-22 09:00',
      type: '专家门诊',
      reason: '青光眼术后复查',
      status: 'pending' as 'pending' | 'confirmed' | 'rejected',
    },
    {
      id: 'apt_2',
      patientName: 'ct', // TODO: 使用真实数据
      time: '2025-05-23 14:30',
      type: '普通门诊',
      reason: '白内障咨询',
      status: 'pending' as 'pending' | 'confirmed' | 'rejected',
    },
  ]);

  // --- Modal 状态 ---
  const [modalVisible, setModalVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDoctorWork = async () => {
      try {
        const [historyResult, appointmentResult] = await Promise.all([
          manageApi.diagnosisHistory({ page: 1, pageSize: 20 }),
          manageApi.appointments(),
        ]);

        const remoteQueue = (historyResult.data?.records || []).map(
          (record: any, index: number) => {
            let parsedDisease: string[] = [];
            try {
              const left = record.leftDiseaseResults
                ? JSON.parse(record.leftDiseaseResults)
                : [];
              const right = record.rightDiseaseResults
                ? JSON.parse(record.rightDiseaseResults)
                : [];
              parsedDisease = Array.from(new Set([...left, ...right]));
            } catch (e) {
              // ignore
            }

            const diseaseStr =
              parsedDisease.length > 0
                ? parsedDisease.join(', ')
                : '暂无确诊数据';
            const isNormal =
              parsedDisease.length === 1 && parsedDisease[0] === '正常';
            const riskLevelStr = isNormal
              ? '低风险'
              : parsedDisease.length > 0
              ? '高风险'
              : '待评估';

            return {
              id: String(record.id || record.recordId || `diag_${index}`),
              recordId: Number(record.id || record.recordId),
              patientName:
                record.patientName ||
                record.name ||
                record.patient?.name ||
                (record.patientId ? `患者 (ID: ${record.patientId})` : '患者'),
              age: record.age || record.patient?.age || '-',
              gender: record.sex || record.gender || record.patient?.sex || '-',
              date:
                record.createTime || record.diagnosisTime || record.time || '-',
              image:
                record.leftImage ||
                record.rightImage ||
                record.image ||
                MOCK_IMAGES[0],
              aiResult: {
                riskLevel: record.riskLevel || riskLevelStr,
                disease: record.disease || record.diagnosis || diseaseStr,
                summary: record.summary || 'AI 正在处理图像特征，请稍候...',
                suggestion: record.suggestion || '目前暂无处理建议',
              },
              status: record.status === 'reviewed' ? 'reviewed' : 'pending',
              doctorAdvice: record.doctorAdvice || '',
              nextStep: record.nextStep || '',
            };
          },
        );

        const remoteAppointments = (appointmentResult.data || []).map(
          (apt: any) => ({
            id: String(apt.id),
            patientName:
              apt.patientName || `患者 ${apt.patientId || ''}`.trim(),
            time: apt.appointmentTime || apt.createTime || '-',
            type: '门诊预约',
            reason: apt.reason || '患者预约',
            status:
              apt.status === 'CONFIRMED'
                ? 'confirmed'
                : apt.status === 'CANCELLED'
                ? 'rejected'
                : 'pending',
          }),
        );

        if (!cancelled) {
          if (remoteQueue.length) setDiagnosisQueue(remoteQueue as any);
          if (remoteAppointments.length)
            setAppointments(remoteAppointments as any);
        }
      } catch (error) {
        console.warn('Load doctor work failed:', error);
      }
    };

    loadDoctorWork();

    return () => {
      cancelled = true;
    };
  }, []);

  // 1. 审核逻辑
  const openReviewModal = (item: any) => {
    setCurrentReview(item);
    setModalVisible(true);
  };

  const handleSaveReview = async (
    id: string,
    advice: string,
    nextStep: string,
  ) => {
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

    const recordId = Number(currentReview?.recordId || id);
    if (!Number.isNaN(recordId)) {
      try {
        await reportApi.generate(recordId, 'ZH');
      } catch (error) {
        console.warn('Generate report failed:', error);
      }
    }

    AppToast.show('审核报告已保存并发送给患者', 'success');
  };

  // 2. 预约逻辑
  const handleAppointment = async (
    id: string,
    action: 'confirmed' | 'rejected',
  ) => {
    if (action === 'confirmed') {
      const numericId = Number(id);
      if (!Number.isNaN(numericId)) {
        try {
          await manageApi.confirmAppointment(numericId);
        } catch (error) {
          console.warn('Confirm appointment failed:', error);
        }
      }
    }

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
