import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { AppToast } from '../../components/Toast';
import { diagnosisApi, guestApi, manageApi } from '../../api';

// 引入拆分的组件
import { DiagnosisItem } from './DiagnosisItem';
import { AppointmentItem } from './AppointmentItem';

export default function Page2() {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'appointment'>(
    'diagnosis',
  );

  // --- 场景一数据 ---
  const [diagnosisQueue, setDiagnosisQueue] = useState<any[]>([]);

  // --- 场景二数据 ---
  const [appointments, setAppointments] = useState<any[]>([]);

  // --- Modal 状态 ---
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<any>(null);
  const [leftEyeUri, setLeftEyeUri] = useState<string | null>(null);
  const [rightEyeUri, setRightEyeUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDoctorWork = async () => {
      try {
        const [patientResult, appointmentResult] = await Promise.all([
          manageApi.allPatients({ page: 1, pageSize: 10 }),
          manageApi.appointments(),
        ]);

        const patientRecords = patientResult.data?.records || [];
        const diagnosisGroups = await Promise.all(
          patientRecords.map(async (patient: any) => {
            try {
              const recordResult = await manageApi.recordsByPatient(patient.id);
              const records = Array.isArray(recordResult.data)
                ? recordResult.data
                : (recordResult.data as any)?.records || [];

              return records.map((record: any, index: number) => {
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

                const diseaseStr = parsedDisease.length > 0 ? parsedDisease.join(', ') : '暂无诊断结果';
                const isNormal =
                  parsedDisease.length === 1 && parsedDisease[0] === '正常';
                const riskLevelStr = parsedDisease.length > 0 ? (isNormal ? '低风险' : '高风险') : '待评估';

                return {
                  id: String(record.id || `${patient.id}_${index}`),
                  recordId: Number(record.id),
                  patientId: patient.id,
                  patientName: patient.name || '',
                  idCard: patient.idCard || '',
                  age: patient.age || '',
                  gender: patient.sex || '',
                  date: record.diagnosisTime || '',
                  aiResult: {
                    riskLevel: riskLevelStr,
                    disease: diseaseStr,
                    summary: diseaseStr,
                    suggestion: '',
                  },
                  processedImages: [],
                  status: record.status === 'reviewed' ? 'reviewed' : 'pending',
                  doctorAdvice: record.doctorAdvice || '',
                  nextStep: record.nextStep || '',
                };
              });
            } catch (error) {
              console.warn('Load patient diagnosis records failed:', error);
              return [];
            }
          }),
        );

        const remoteQueue = diagnosisGroups.flat();

        const remoteAppointments = (appointmentResult.data || []).map(
          (apt: any) => ({
            id: String(apt.id),
            patientId: String(apt.patientId || ''),
            doctorId: String(apt.doctorId || ''),
            time: apt.appointmentTime || '',
            createTime: apt.createTime || '',
            confirmTime: apt.confirmTime || '',
            cancelTime: apt.cancelTime || '',
            status:
              apt.status === 'CONFIRMED'
                ? 'confirmed'
                : apt.status === 'CANCELLED'
                ? 'rejected'
                : 'pending',
          }),
        );

        if (!cancelled) {
          setDiagnosisQueue(remoteQueue as any);
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

  const openUploadModal = (item: any) => {
    setUploadTarget(item);
    setLeftEyeUri(null);
    setRightEyeUri(null);
    setUploadVisible(true);
  };

  const closeUploadModal = () => {
    if (analyzing) return;
    setUploadVisible(false);
    setUploadTarget(null);
  };

  // 1. 审核逻辑
  const openReviewModal = (item: any) => {
    openUploadModal(item);
  };


  const openGallery = async (eye: 'left' | 'right') => {
    if (Platform.OS === 'android') {
      const perm =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(perm);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        AppToast.show('需要相册权限才能选择图片', 'error');
        return;
      }
    }

    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, response => {
      const uri = response.assets?.[0]?.uri;
      if (!uri) return;
      if (eye === 'left') setLeftEyeUri(uri);
      else setRightEyeUri(uri);
    });
  };

  const openCamera = async (eye: 'left' | 'right') => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        AppToast.show('需要相机权限才能拍照', 'error');
        return;
      }
    }

    launchCamera({ mediaType: 'photo', saveToPhotos: false }, response => {
      const uri = response.assets?.[0]?.uri;
      if (!uri) return;
      if (eye === 'left') setLeftEyeUri(uri);
      else setRightEyeUri(uri);
    });
  };

  const handleSelectImage = (eye: 'left' | 'right') => {
    AppToast.alert('上传眼底照片', '请选择图像来源', [
      { text: '拍照', onPress: () => openCamera(eye) },
      { text: '相册', onPress: () => openGallery(eye) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const handleAnalyzeImages = async () => {
    if (!uploadTarget || !leftEyeUri || !rightEyeUri) {
      AppToast.show('请先上传左右眼照片', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const patient = {
        id: Number(uploadTarget.patientId),
        name: uploadTarget.patientName,
        idCard: uploadTarget.idCard,
        age: Number(uploadTarget.age) || undefined,
        sex: uploadTarget.gender,
      };

      const [diagnosisResult, guestResult] = await Promise.all([
        diagnosisApi.analyze([patient], [leftEyeUri], [rightEyeUri]),
        guestApi.analyze(leftEyeUri, rightEyeUri),
      ]);

      const diagnosisRecord = diagnosisResult.data?.[0] || {};
      const guestRecord = Array.isArray((guestResult as any).data)
        ? (guestResult as any).data[0]
        : (guestResult as any).data;
      const leftDiseaseResult = guestRecord?.leftDiseaseResult || [];
      const rightDiseaseResult = guestRecord?.rightDiseaseResult || [];
      const diseaseResult = Array.from(
        new Set([...leftDiseaseResult, ...rightDiseaseResult]),
      );
      const isNormal =
        diseaseResult.length === 1 && diseaseResult[0] === '正常';
      const diseaseText = diseaseResult.length ? diseaseResult.join(', ') : '暂无诊断结果';
      const processedImages = guestRecord?.processedImgPaths || [];

      setDiagnosisQueue(queue =>
        queue.map(item =>
          item.id === uploadTarget.id
            ? {
                ...item,
                recordId: Number((diagnosisRecord as any).recordId || item.recordId),
                aiResult: {
                  riskLevel: diseaseResult.length ? (isNormal ? '低风险' : '高风险') : '待评估',
                  disease: diseaseText,
                  summary: diseaseText,
                  suggestion: '',
                },
                processedImages,
              }
            : item,
        ),
      );

      AppToast.show('病例已更新', 'success');
      closeUploadModal();
    } catch (error) {
      console.warn('Analyze images failed:', error);
      AppToast.show('诊断更新失败，请稍后重试', 'error');
    } finally {
      setAnalyzing(false);
    }
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
          const result = await manageApi.confirmAppointment(numericId);
          if (result.code !== 1) {
            throw new Error(result.msg || '确认预约失败');
          }
          AppToast.show(String(result.data || '预约确认成功'), 'success');
        } catch (error: any) {
          console.warn('Confirm appointment failed:', error);
          AppToast.show(error?.message || '确认预约失败', 'error');
          return;
        }
      }
    }

    const updated = appointments.map(apt =>
      apt.id === id ? { ...apt, status: action } : apt,
    );
    setAppointments(updated as any);
    if (action === 'rejected') {
      AppToast.show('已在本地标记为拒绝', 'info');
    }
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

      <Modal visible={uploadVisible} animationType="slide" transparent={false}>
        <View style={styles.uploadContainer}>
          <View style={styles.uploadHeader}>
            <Text style={styles.uploadTitle}>更新病例</Text>
            <TouchableOpacity onPress={closeUploadModal}>
              <Text style={styles.closeText}>取消</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.uploadContent}>
            <Text style={styles.patientName}>{uploadTarget?.patientName}</Text>
            <Text style={styles.patientMeta}>
              {uploadTarget?.gender} | {uploadTarget?.age}岁 | {uploadTarget?.idCard}
            </Text>
            <View style={styles.uploadRow}>
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={() => handleSelectImage('left')}
              >
                {leftEyeUri ? (
                  <Image source={{ uri: leftEyeUri }} style={styles.previewImage} />
                ) : (
                  <Text style={styles.placeholder}>+ 左眼</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={() => handleSelectImage('right')}
              >
                {rightEyeUri ? (
                  <Image source={{ uri: rightEyeUri }} style={styles.previewImage} />
                ) : (
                  <Text style={styles.placeholder}>+ 右眼</Text>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
              onPress={handleAnalyzeImages}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.analyzeBtnText}>上传并更新诊断</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  uploadContainer: { flex: 1, backgroundColor: '#f4f6f8' },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 46,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  uploadTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeText: { color: '#007AFF', fontSize: 16 },
  uploadContent: { padding: 20 },
  patientName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  patientMeta: { marginTop: 6, color: '#666' },
  uploadRow: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 24 },
  uploadBox: {
    flex: 1,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#e9edf2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { color: '#777', fontSize: 18 },
  analyzeBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeBtnDisabled: { backgroundColor: '#8BBEF5' },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
