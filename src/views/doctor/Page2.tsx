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
  ScrollView,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { AppToast } from '../../components/Toast';
import { diagnosisApi, guestApi, manageApi, reportApi } from '../../api';

// 引入拆分的组件
import { DiagnosisItem } from './DiagnosisItem';
import { AppointmentItem } from './AppointmentItem';

type ReportLanguage = 'ZH' | 'EN';
type ReportFormat = 'pdf' | 'png' | 'html';

const REPORT_LANGUAGES: Array<{ label: string; value: ReportLanguage }> = [
  { label: '中文', value: 'ZH' },
  { label: 'English', value: 'EN' },
];

const REPORT_FORMATS: Array<{ label: string; value: ReportFormat }> = [
  { label: 'PDF', value: 'pdf' },
  { label: 'PNG', value: 'png' },
  { label: 'HTML', value: 'html' },
];

const getRiskLevelByTopDisease = (diseases: string[]) => {
  const topDisease = diseases[0];
  if (!topDisease) return '待评估';
  return topDisease === '正常' ? '低风险' : '高风险';
};

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

  // --- 报告生成/下载 状态 ---
  const [reportRecordId, setReportRecordId] = useState<number | null>(null);
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>('ZH');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [downloadReportFormat, setDownloadReportFormat] =
    useState<ReportFormat>('pdf');
  const [reportContent, setReportContent] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
                let leftDisease: string[] = [];
                let rightDisease: string[] = [];
                try {
                  leftDisease = record.leftDiseaseResults
                    ? JSON.parse(record.leftDiseaseResults)
                    : [];
                  rightDisease = record.rightDiseaseResults
                    ? JSON.parse(record.rightDiseaseResults)
                    : [];
                } catch {
                  // ignore
                }

                const parsedDisease = [...leftDisease, ...rightDisease];
                const diseaseStr = parsedDisease.length > 0 ? parsedDisease.join(', ') : '暂无诊断结果';
                const riskLevelStr = getRiskLevelByTopDisease(parsedDisease);

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
                    leftDisease: leftDisease.length ? leftDisease.join(', ') : '暂无诊断结果',
                    rightDisease: rightDisease.length ? rightDisease.join(', ') : '暂无诊断结果',
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
    // 报告生成需要本次分析后返回的 recordId，不直接预填历史 item.recordId，
    // 强制让医生先完成"上传并更新诊断"才解锁报告生成区
    setReportRecordId(null);
    setCurrentReportId(null);
    setReportContent('');
    setReportLanguage('ZH');
    setReportFormat('pdf');
    setDownloadReportFormat('pdf');
    setUploadVisible(true);
  };

  const closeUploadModal = () => {
    if (analyzing || generatingReport || downloading) return;
    setUploadVisible(false);
    setUploadTarget(null);
    setReportRecordId(null);
    setCurrentReportId(null);
    setReportContent('');
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

    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
      },
      response => {
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

    launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: false,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
      },
      response => {
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

      const diagnosisResult = await diagnosisApi.analyze(
        [patient],
        [leftEyeUri],
        [rightEyeUri],
      );
      if (diagnosisResult.code !== 1) {
        throw new Error(diagnosisResult.msg || '诊断记录更新失败');
      }
      AppToast.show('诊断记录已保存', 'success');

      const guestResult = await guestApi.analyze(leftEyeUri, rightEyeUri);
      if (guestResult.code !== 1) {
        throw new Error(guestResult.msg || 'AI 图像分析失败');
      }
      AppToast.show('AI 图像分析完成', 'success');

      const diagnosisRecord = diagnosisResult.data?.[0] || {};
      const newRecordId = Number(
        (diagnosisRecord as any).recordId || uploadTarget.recordId,
      );
      const guestRecord = Array.isArray((guestResult as any).data)
        ? (guestResult as any).data[0]
        : (guestResult as any).data;
      const leftDiseaseResult = guestRecord?.leftDiseaseResult || [];
      const rightDiseaseResult = guestRecord?.rightDiseaseResult || [];
      const diseaseResult = [...leftDiseaseResult, ...rightDiseaseResult];
      const diseaseText = diseaseResult.length ? diseaseResult.join(', ') : '暂无诊断结果';
      const processedImages = guestRecord?.processedImgPaths || [];

      setDiagnosisQueue(queue =>
        queue.map(item =>
          item.id === uploadTarget.id
            ? {
                ...item,
                recordId: newRecordId || item.recordId,
                aiResult: {
                  riskLevel: getRiskLevelByTopDisease(diseaseResult),
                  disease: diseaseText,
                  leftDisease: leftDiseaseResult.length ? leftDiseaseResult.join(', ') : '暂无诊断结果',
                  rightDisease: rightDiseaseResult.length ? rightDiseaseResult.join(', ') : '暂无诊断结果',
                  summary: diseaseText,
                  suggestion: '',
                },
                processedImages,
              }
            : item,
        ),
      );

      if (newRecordId) {
        setReportRecordId(newRecordId);
      }
      setCurrentReportId(null);
      setReportContent('');
    } catch (error: any) {
      console.warn('Analyze images failed:', error);
      const message = error?.message || '诊断更新失败，请稍后重试';
      AppToast.show(message, 'error');
      AppToast.alert('诊断更新失败', message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateReport = async () => {
    if (!reportRecordId) {
      AppToast.show('暂无诊断记录，请先上传并更新病例', 'error');
      return;
    }
    setGeneratingReport(true);
    try {
      const result = await reportApi.generate(reportRecordId, reportLanguage);
      if (result.code !== 1) {
        throw new Error(result.msg || '报告生成失败');
      }
      const report = result.data;
      if (report?.id) {
        setCurrentReportId(report.id);
      }
      setDownloadReportFormat(reportFormat);
      setReportContent(report?.reportContent || '');
      AppToast.show('报告生成成功', 'success');
    } catch (error: any) {
      console.warn('Generate report failed:', error);
      AppToast.show(error?.message || '报告生成失败，请稍后重试', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = async () => {
    if (downloading) return;
    if (!currentReportId) {
      AppToast.show('暂无可下载的报告，请先生成报告', 'error');
      return;
    }
    setDownloading(true);
    try {
      const fromUrl = reportApi.downloadUrl(currentReportId, downloadReportFormat);
      const headers = reportApi.downloadHeaders();
      const filename = `Report_${currentReportId}_${Date.now()}.${downloadReportFormat}`;
      const mimeMap: Record<typeof downloadReportFormat, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        html: 'text/html',
      };
      const mime = mimeMap[downloadReportFormat] || 'application/octet-stream';
      console.log('[downloadReport] GET', fromUrl, headers);

      if (Platform.OS === 'android') {
        // Android: 使用 DownloadManager，下载完会出现系统下载通知，文件落入公共 Downloads 目录
        // 注意：走 DownloadManager 的请求不经过 App 自身的 HTTP 栈（Charles 抓不到，需在系统层抓包）
        // 不要指定 path —— blob-util 的 dirs.DownloadDir 是 App 私有外部目录，不是公共 Downloads；
        // 不传 path，DownloadManager 会按 mediaScannable + mime 自动放到 /storage/emulated/0/Download/
        const res = await ReactNativeBlobUtil.config({
          fileCache: true,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: filename,
            description: '诊断报告下载',
            mime,
            mediaScannable: true,
          },
        }).fetch('GET', fromUrl, headers);

        // DownloadManager 不返回标准 HTTP status，用 path() 是否拿到落地路径来判断成功
        const savedPath = res.path();
        console.log('[downloadReport] saved path', savedPath, 'info', res.info());
        if (savedPath) {
          AppToast.alert('下载完成', `已保存到：\n${savedPath}`);
        } else {
          throw new Error('下载失败：DownloadManager 未返回文件路径');
        }
      } else {
        // iOS: 下载到 App Documents 目录，由用户通过文件 App 访问
        const destPath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${filename}`;
        const res = await ReactNativeBlobUtil.config({
          path: destPath,
          fileCache: true,
        }).fetch('GET', fromUrl, headers);

        const status = res.info().status;
        console.log('[downloadReport] status', status);
        if (status >= 200 && status < 300) {
          AppToast.show(`保存成功：${destPath}`, 'success');
        } else {
          throw new Error(`下载失败 (Code: ${status})`);
        }
      }
    } catch (err: any) {
      console.warn('Report download error:', err);
      AppToast.show(`下载出错: ${err?.message || '未知错误'}`, 'error');
    } finally {
      setDownloading(false);
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
            <TouchableOpacity onPress={closeUploadModal} hitSlop={10}>
              <Text style={styles.closeText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.uploadTitle}>更新病例</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView
            contentContainerStyle={styles.uploadContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 患者信息卡 */}
            <View style={styles.patientCard}>
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {(uploadTarget?.patientName || '?').slice(0, 1)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{uploadTarget?.patientName || '未知患者'}</Text>
                <Text style={styles.patientMeta}>
                  {uploadTarget?.gender || '-'} · {uploadTarget?.age || '-'}岁 · {uploadTarget?.idCard || '-'}
                </Text>
              </View>
            </View>

            {/* 步骤一：上传眼底照 */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>上传眼底照片并分析</Text>
              </View>
              <Text style={styles.stepHint}>请分别选择左眼与右眼照片，点击下方按钮完成 AI 分析与诊断记录保存。</Text>
              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={[styles.uploadBox, leftEyeUri && styles.uploadBoxFilled]}
                  onPress={() => handleSelectImage('left')}
                  activeOpacity={0.8}
                >
                  {leftEyeUri ? (
                    <Image source={{ uri: leftEyeUri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholderBox}>
                      <Text style={styles.placeholderIcon}>+</Text>
                      <Text style={styles.placeholder}>左眼</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadBox, rightEyeUri && styles.uploadBoxFilled]}
                  onPress={() => handleSelectImage('right')}
                  activeOpacity={0.8}
                >
                  {rightEyeUri ? (
                    <Image source={{ uri: rightEyeUri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.uploadPlaceholderBox}>
                      <Text style={styles.placeholderIcon}>+</Text>
                      <Text style={styles.placeholder}>右眼</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.analyzeBtn,
                  (analyzing || !leftEyeUri || !rightEyeUri) && styles.analyzeBtnDisabled,
                ]}
                onPress={handleAnalyzeImages}
                disabled={analyzing || !leftEyeUri || !rightEyeUri}
                activeOpacity={0.85}
              >
                {analyzing ? (
                  <View style={styles.btnInline}>
                    <ActivityIndicator color="#fff" />
                    <Text style={[styles.analyzeBtnText, { marginLeft: 8 }]}>分析中...</Text>
                  </View>
                ) : (
                  <Text style={styles.analyzeBtnText}>上传并更新诊断</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 步骤二：生成报告 */}
            <View
              style={[
                styles.stepCard,
                !reportRecordId && styles.stepCardLocked,
              ]}
            >
              <View style={styles.stepHeader}>
                <View
                  style={[
                    styles.stepBadge,
                    !reportRecordId && styles.stepBadgeLocked,
                  ]}
                >
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    !reportRecordId && { color: '#9aa0a6' },
                  ]}
                >
                  生成诊断报告
                </Text>
              </View>

              {!reportRecordId ? (
                <Text style={styles.stepHint}>请先完成上一步"上传并更新诊断"，AI 分析成功后即可在此生成报告。</Text>
              ) : (
                <>
                  <View style={styles.successBanner}>
                    <Text style={styles.successBannerText}>AI 分析已完成，可生成正式诊断报告</Text>
                  </View>

                  <Text style={styles.optionTitle}>报告语言</Text>
                  <View style={styles.optionRow}>
                    {REPORT_LANGUAGES.map(item => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.optionChip,
                          reportLanguage === item.value && styles.optionChipActive,
                        ]}
                        onPress={() => setReportLanguage(item.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            reportLanguage === item.value && styles.optionChipTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.optionTitle}>下载格式</Text>
                  <View style={styles.optionRow}>
                    {REPORT_FORMATS.map(item => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.optionChip,
                          reportFormat === item.value && styles.optionChipActive,
                        ]}
                        onPress={() => setReportFormat(item.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            reportFormat === item.value && styles.optionChipTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.btnGenerate,
                      generatingReport && styles.btnGenerateDisabled,
                    ]}
                    onPress={generateReport}
                    disabled={generatingReport}
                    activeOpacity={0.85}
                  >
                    {generatingReport ? (
                      <View style={styles.btnInline}>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={[styles.analyzeBtnText, { marginLeft: 8 }]}>生成中...</Text>
                      </View>
                    ) : (
                      <Text style={styles.analyzeBtnText}>
                        生成{reportLanguage === 'ZH' ? '中文' : '英文'}报告
                      </Text>
                    )}
                  </TouchableOpacity>

                  {reportContent ? (
                    <View style={styles.reportPreviewBox}>
                      <Text style={styles.reportPreviewTitle}>报告内容预览</Text>
                      <Text style={styles.reportPreviewText} numberOfLines={12}>
                        {reportContent}
                      </Text>
                    </View>
                  ) : null}

                  {currentReportId ? (
                    <TouchableOpacity
                      style={[
                        styles.btnDownload,
                        downloading && styles.btnDownloadDisabled,
                      ]}
                      onPress={downloadReport}
                      disabled={downloading}
                      activeOpacity={0.85}
                    >
                      {downloading ? (
                        <View style={styles.btnInline}>
                          <ActivityIndicator size="small" color="white" />
                          <Text style={[styles.analyzeBtnText, { marginLeft: 8 }]}>下载中...</Text>
                        </View>
                      ) : (
                        <Text style={styles.analyzeBtnText}>
                          下载完整 {downloadReportFormat.toUpperCase()} 报告
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 46,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3e6ea',
  },
  uploadTitle: { fontSize: 17, fontWeight: '600', color: '#1c1f23' },
  closeText: { color: '#007AFF', fontSize: 15 },
  uploadContent: { padding: 16, paddingBottom: 36 },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f1ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientAvatarText: { color: '#1976d2', fontSize: 18, fontWeight: '700' },
  patientName: { fontSize: 17, fontWeight: '600', color: '#1c1f23' },
  patientMeta: { marginTop: 4, color: '#5f6368', fontSize: 13 },

  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  stepCardLocked: { opacity: 0.85 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepBadgeLocked: { backgroundColor: '#c4c7cc' },
  stepBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#1c1f23' },
  stepHint: { fontSize: 13, color: '#5f6368', lineHeight: 19, marginBottom: 14 },

  uploadRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  uploadBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#f1f3f6',
    borderWidth: 1,
    borderColor: '#e3e6ea',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadBoxFilled: { borderStyle: 'solid', borderColor: '#1976d2', backgroundColor: '#e8f1ff' },
  uploadPlaceholderBox: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 26, color: '#9aa0a6', marginBottom: 4 },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { color: '#5f6368', fontSize: 14 },
  analyzeBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  analyzeBtnDisabled: { backgroundColor: '#bcd6ee' },
  analyzeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnInline: { flexDirection: 'row', alignItems: 'center' },

  successBanner: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  successBannerText: { color: '#2e7d32', fontSize: 13 },

  optionTitle: { fontSize: 13, color: '#5f6368', fontWeight: '600', marginBottom: 8 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  optionChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d6e4ff',
    backgroundColor: '#f8fbff',
  },
  optionChipActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
  optionChipText: { color: '#1976d2', fontWeight: '600', fontSize: 13 },
  optionChipTextActive: { color: '#fff' },
  btnGenerate: {
    backgroundColor: '#1976d2',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnGenerateDisabled: { backgroundColor: '#90caf9' },
  btnDownload: {
    backgroundColor: '#43a047',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDownloadDisabled: { backgroundColor: '#a5d6a7' },
  reportPreviewBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reportPreviewTitle: { fontSize: 14, fontWeight: '600', color: '#1c1f23', marginBottom: 6 },
  reportPreviewText: { fontSize: 13, color: '#5f6368', lineHeight: 20 },
});
