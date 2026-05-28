import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'; // 新增 launchCamera
import RNFS from 'react-native-fs';

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

import { AppToast } from '../../components/Toast';
import { diagnosisApi, guestApi, patientApi, reportApi } from '../../api';
import type { DiagnosisReport } from '../../api/types';
import { getCurrentUser } from '../../store/user';

export default function PatientDiagnosis() {
  const [leftEyeUri, setLeftEyeUri] = useState<string | null>(null);
  const [rightEyeUri, setRightEyeUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'diagnosing' | 'finished'>(
    'idle',
  );
  const [downloading, setDownloading] = useState(false);

  const [currentResult, setCurrentResult] = useState({
    riskLevel: '',
    disease: '',
    summary: '',
    suggestion: '',
  });
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [reportContent, setReportContent] = useState('');
  const [followUpPlan, setFollowUpPlan] = useState('');
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>('ZH');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
  const [reportRecordId, setReportRecordId] = useState<number | null>(null);
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);
  const [historyReports, setHistoryReports] = useState<DiagnosisReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const loadHistoryReports = async () => {
    setLoadingReports(true);
    try {
      const result = await patientApi.reports();
      setHistoryReports(result.data || []);
    } catch (error) {
      console.warn('Load patient reports failed:', error);
      AppToast.show('历史报告加载失败', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadHistoryReports();
  }, []);

  const openHistoryReport = (report: DiagnosisReport) => {
    setCurrentReportId(report.id || null);
    setReportRecordId(report.recordId || null);
    setReportContent(report.reportContent || '');
    setFollowUpPlan(extractFollowUpPlan(report.reportContent));
    if (report.language === 'ZH' || report.language === 'EN') {
      setReportLanguage(report.language);
    }
    if (report.format) {
      const format = report.format.toLowerCase();
      if (format === 'pdf' || format === 'png' || format === 'html') {
        setReportFormat(format);
      }
    }
    setStatus('finished');
  };

  // 重构：原 pickImage 改名为 openGallery，保留原有逻辑
  const openGallery = async (eye: 'left' | 'right') => {
    // 简单权限检查（沿用 Page3 的逻辑简化版）
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
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        if (uri) {
          if (eye === 'left') setLeftEyeUri(uri);
          else setRightEyeUri(uri);
        }
      }
    });
  };

  // 新增：打开相机逻辑
  const openCamera = async (eye: 'left' | 'right') => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          AppToast.show('需要相机权限才能拍照', 'error');
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    launchCamera({ mediaType: 'photo', saveToPhotos: false }, response => {
      if (response.errorCode) {
        console.error('Camera Error: ', response.errorMessage);
        AppToast.show('相机启动失败: ' + response.errorMessage, 'error');
        return;
      }
      if (response.didCancel) {
        // 用户取消拍照，不做提示或仅打印日志
        console.log('User cancelled image picker');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        if (uri) {
          if (eye === 'left') setLeftEyeUri(uri);
          else setRightEyeUri(uri);
        }
      }
    });
  };

  // 新增：统一选择入口
  const handleSelectImage = (eye: 'left' | 'right') => {
    AppToast.alert('上传眼底照片', '请选择图像来源', [
      { text: '拍照', onPress: () => openCamera(eye) },
      { text: '相册', onPress: () => openGallery(eye) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const formatDiseaseResult = (results?: string[]) => {
    return results?.length ? results.join('、') : '暂无诊断结果';
  };

  const formatConfidence = (values?: number[]) => {
    return values?.length ? values.map(value => `${value}%`).join('、') : '暂无置信度';
  };

  const extractFollowUpPlan = (content?: string) => {
    if (!content) return '';

    const matches = Array.from(content.matchAll(/--随访计划：([\s\S]*?)(?=\n--|\n\n--|$)/g));
    return matches.map(match => match[1]?.trim()).filter(Boolean).join('\n\n');
  };

  const startDiagnosis = async () => {
    if (!leftEyeUri || !rightEyeUri) {
      AppToast.show('请先上传双眼照片', 'error');
      return;
    }
    setStatus('diagnosing');

    setProcessedImages([]);
    setReportContent('');
    setFollowUpPlan('');
    setCurrentResult({
      riskLevel: '分析中...',
      disease: '正在计算',
      summary: 'AI 正在处理图像特征，请稍候...',
      suggestion: '诊断完成后将显示建议',
    });

    try {
      const currentUser: any = getCurrentUser() || {};
      const patientInfo = currentUser.patient || {};
      const patientId = Number(
        patientInfo.id || currentUser.patientId || currentUser.userId || currentUser.id,
      );

      if (!patientId) {
        AppToast.show('缺少患者信息，请先登录或完善个人资料', 'error');
        setStatus('idle');
        return;
      }

      const patient = {
        id: patientId,
        name: patientInfo.name || currentUser.name || currentUser.username,
        idCard: patientInfo.idCard || currentUser.idCard,
        age: Number(patientInfo.age || currentUser.age) || undefined,
        sex: patientInfo.sex || currentUser.sex || currentUser.gender,
      };

      const [diagnosisResult, guestResult] = await Promise.all([
        diagnosisApi.analyze([patient], [leftEyeUri], [rightEyeUri]),
        guestApi.analyze(leftEyeUri, rightEyeUri),
      ]);

      const diagnosisRecord = diagnosisResult.data?.[0];
      const guestRecord = guestResult.data?.[0];
      const leftDiseaseText = formatDiseaseResult(guestRecord?.leftDiseaseResult);
      const rightDiseaseText = formatDiseaseResult(guestRecord?.rightDiseaseResult);
      const allDiseases = Array.from(
        new Set([
          ...(guestRecord?.leftDiseaseResult || []),
          ...(guestRecord?.rightDiseaseResult || []),
        ]),
      );
      const onlyNormal = allDiseases.length === 1 && allDiseases[0] === '正常';
      const diseaseText = allDiseases.length ? allDiseases.join('、') : '暂无诊断结果';

      setProcessedImages(guestRecord?.processedImgPaths || []);
      setCurrentResult({
        riskLevel: allDiseases.length ? (onlyNormal ? '正常' : '需关注') : '待评估',
        disease: diseaseText,
        summary: `左眼: ${leftDiseaseText}\n右眼: ${rightDiseaseText}`,
        suggestion: `左眼置信度: ${formatConfidence(guestRecord?.leftConfidence)}\n右眼置信度: ${formatConfidence(guestRecord?.rightConfidence)}`,
      });

      if (diagnosisRecord?.recordId) {
        setCurrentReportId(diagnosisRecord.recordId);
        try {
          setReportRecordId(diagnosisRecord.recordId);
          const reportResult = await reportApi.generate(diagnosisRecord.recordId, reportLanguage);
          if (reportResult.data?.id) {
            setCurrentReportId(reportResult.data.id);
          }
          const nextReportContent = reportResult.data?.reportContent || '';
          setReportContent(nextReportContent);
          setFollowUpPlan(extractFollowUpPlan(nextReportContent));
          loadHistoryReports();
        } catch (error) {
          console.warn('Generate report failed:', error);
        }
      }
    } catch (error) {
      console.warn('Diagnosis analyze failed:', error);
      AppToast.show('诊断服务异常，请稍后重试', 'error');
      // 出错时恢复状态或显示错误信息
      setCurrentResult({
        riskLevel: '错误',
        disease: '诊断失败',
        summary: '连接服务器失败或处理出错。',
        suggestion: '请检查网络后重试。',
      });
    } finally {
      setStatus('finished');
    }
  };

  // 改良版：添加到日历并请求权限
  const addToCalendar = async () => {
    try {
      // 1. 定义需要的权限 (日历读写 + 通知提醒)
      const permissionsToCheck: any[] = [];

      if (Platform.OS === 'android') {
        permissionsToCheck.push(PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR);
        permissionsToCheck.push(PermissionsAndroid.PERMISSIONS.READ_CALENDAR);

        // Android 13+ 需要通知权限来模拟通知推送
        if (Platform.Version >= 33) {
          permissionsToCheck.push(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }

        // 2. 发起请求
        console.log('正在请求权限:', permissionsToCheck);
        const results = await PermissionsAndroid.requestMultiple(
          permissionsToCheck,
        );

        // 3. 检查核心权限
        const calendarGranted =
          results[PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (!calendarGranted) {
          AppToast.alert(
            '权限受限',
            '无法访问日历，请在设置中手动开启“日历”权限。',
            [
              { text: '取消', style: 'cancel' },
              { text: '去设置', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }

      AppToast.alert(
        '打开日历',
        '即将打开系统日历，请在日历中自行选择复查时间并添加提醒。',
        [
          { text: '知道了' },
          {
            text: '打开日历',
            onPress: async () => {
              try {
                const now = Date.now();
                await Linking.openURL(
                  Platform.OS === 'android'
                    ? `content://com.android.calendar/time/${now}`
                    : `calshow:${now / 1000}`,
                );
              } catch (err) {
                console.warn('打开日历失败:', err);
                AppToast.show('无法自动打开日历应用，请手动查看', 'error');
              }
            },
          },
        ],
      );
    } catch (err) {
      console.warn('Calendar permission error:', err);
      AppToast.show('请求日历权限时发生异常', 'error');
    }
  };

  const regenerateReport = async (language: ReportLanguage) => {
    if (!reportRecordId) return;

    try {
      const reportResult = await reportApi.generate(reportRecordId, language);
      if (reportResult.data?.id) {
        setCurrentReportId(reportResult.data.id);
      }
      setReportContent(reportResult.data?.reportContent || '');
    } catch (error) {
      console.warn('Regenerate report failed:', error);
      AppToast.show('报告语言切换失败，请稍后重试', 'error');
    }
  };

  const handleReportLanguageChange = (language: ReportLanguage) => {
    setReportLanguage(language);
    regenerateReport(language);
  };

  const downloadReport = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      // 1. Android 权限检查
      if (Platform.OS === 'android') {
        // 只有低版本或者确实需要显式权限时请求
        if (Platform.Version < 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: '存储权限申请',
              message: 'App需要访问存储空间以保存诊断报告。',
              buttonNeutral: '稍后',
              buttonNegative: '取消',
              buttonPositive: '确定',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            AppToast.show('无法保存：用户拒绝了存储权限', 'error');
            setDownloading(false);
            return;
          }
        }
      }

      const destPath =
        Platform.OS === 'android'
          ? `${RNFS.DownloadDirectoryPath}/Report_${Date.now()}.${reportFormat}`
          : `${RNFS.DocumentDirectoryPath}/Report_${Date.now()}.${reportFormat}`;

      console.log('Start downloading to:', destPath);

      let source: { uri: string; headers?: Record<string, string> } | null = null;

      if (currentReportId) {
        source = {
          uri: reportApi.downloadUrl(currentReportId, reportFormat),
          headers: reportApi.downloadHeaders(),
        };
      } 
      
      if (!source || !source.uri) {
        throw new Error('暂无可下载的报告 ID，请先完成诊断');
      }

      const downloadOptions: RNFS.DownloadFileOptions = {
        fromUrl: source.uri,
        toFile: destPath,
        begin: res => console.log('Download begin', res),
      };

      if ('headers' in source && source.headers) {
        downloadOptions.headers = source.headers;
      }

      const result = await RNFS.downloadFile(downloadOptions).promise;

      if (result.statusCode === 200) {
        AppToast.show(`保存成功：${destPath}`, 'success');
      } else {
        throw new Error(`下载失败 (Code: ${result.statusCode})`);
      }
    } catch (err: any) {
      console.warn('Report download error:', err);
      AppToast.show(`下载出错: ${err.message || '未知错误'}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (status === 'finished') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>{currentResult.disease ? '诊断结果' : '历史诊断报告'}</Text>
          {currentResult.disease ? (
            <>
              <Text style={styles.resultText}>
                风险等级:{' '}
                <Text
                  style={{
                    color: currentResult.riskLevel === '正常' ? '#4CAF50' : 'red',
                    fontWeight: 'bold',
                  }}
                >
                  {currentResult.riskLevel}
                </Text>
              </Text>
              <Text style={styles.resultText}>
                疑似病症: {currentResult.disease}
              </Text>
              <Text style={styles.detailText}>{currentResult.summary}</Text>
              <Text
                style={[
                  styles.detailText,
                  { marginTop: 10, color: '#333', fontWeight: 'bold' },
                ]}
              >
                置信度: {currentResult.suggestion}
              </Text>
            </>
          ) : null}

          {processedImages.length ? (
            <View style={styles.processedImageRow}>
              {processedImages.map((uri, index) => (
                <Image
                  key={`${uri}_${index}`}
                  source={{ uri }}
                  style={styles.processedImage}
                />
              ))}
            </View>
          ) : null}

          {reportContent ? (
            <View style={styles.reportPreviewBox}>
              <Text style={styles.reportPreviewTitle}>报告内容预览</Text>
              <Text style={styles.reportPreviewText} numberOfLines={12}>
                {reportContent}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {followUpPlan ? (
            <>
              <Text style={styles.sectionTitle}>个性化随访计划</Text>
              <View style={styles.planBox}>
                <Text style={styles.planText}>{followUpPlan}</Text>
              </View>
            </>
          ) : null}

          <TouchableOpacity style={styles.btnCalendar} onPress={addToCalendar}>
            <Text style={styles.btnText}>同步至手机日历与提醒</Text>
          </TouchableOpacity>

          <View style={styles.reportOptionBox}>
            <Text style={styles.optionTitle}>报告语言</Text>
            <View style={styles.optionRow}>
              {REPORT_LANGUAGES.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.optionChip,
                    reportLanguage === item.value && styles.optionChipActive,
                  ]}
                  onPress={() => handleReportLanguageChange(item.value)}
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
          </View>

          <TouchableOpacity
            style={[
              styles.btnDownload,
              downloading && { backgroundColor: '#A5D6A7' },
            ]}
            onPress={downloadReport}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.btnText}>下载完整 {reportFormat.toUpperCase()} 报告</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnRetry}
            onPress={() => {
              setStatus('idle');
              setLeftEyeUri(null);
              setRightEyeUri(null);
              setProcessedImages([]);
              setReportContent('');
              setFollowUpPlan('');
              setReportRecordId(null);
              setCurrentReportId(null);
              loadHistoryReports();
            }}
          >
            <Text style={{ color: '#666' }}>返回上传诊断</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>上传眼底图像</Text>

      <View style={styles.historyReportCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>历史诊断报告</Text>
          <TouchableOpacity onPress={loadHistoryReports} disabled={loadingReports}>
            <Text style={styles.refreshText}>{loadingReports ? '加载中...' : '刷新'}</Text>
          </TouchableOpacity>
        </View>
        {historyReports.length ? (
          historyReports.map(report => (
            <TouchableOpacity
              key={report.id || `${report.recordId}_${report.createTime}`}
              style={styles.historyReportItem}
              onPress={() => openHistoryReport(report)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.historyReportTitle}>报告 #{report.id || '-'}</Text>
                <Text style={styles.historyReportMeta}>
                  记录 ID: {report.recordId || '-'} · {report.language || 'ZH'} · {report.format || 'PDF'}
                </Text>
                <Text style={styles.historyReportMeta}>{report.createTime || '暂无时间'}</Text>
              </View>
              <Text style={styles.historyReportAction}>查看</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>{loadingReports ? '正在加载历史报告...' : '暂无历史诊断报告'}</Text>
        )}
      </View>

      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => handleSelectImage('left')}
        >
          {leftEyeUri ? (
            <Image source={{ uri: leftEyeUri }} style={styles.thumb} />
          ) : (
            <Text style={styles.placeholder}>+ 左眼</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => handleSelectImage('right')}
        >
          {rightEyeUri ? (
            <Image source={{ uri: rightEyeUri }} style={styles.thumb} />
          ) : (
            <Text style={styles.placeholder}>+ 右眼</Text>
          )}
        </TouchableOpacity>
      </View>

      {status === 'diagnosing' ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={{ marginTop: 10 }}>AI正在分析眼底特征...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.btnPrimary} onPress={startDiagnosis}>
          <Text style={styles.btnText}>提交诊断</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f4f6f8' },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  historyReportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshText: { color: '#2196F3', fontWeight: '600' },
  historyReportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyReportTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  historyReportMeta: { fontSize: 12, color: '#777', marginTop: 3 },
  historyReportAction: { color: '#2196F3', fontWeight: 'bold' },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  uploadBox: {
    width: '48%',
    height: 150,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  placeholder: { fontSize: 18, color: '#888' },
  btnPrimary: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  loadingBox: { alignItems: 'center', marginTop: 20 },

  resultCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  resultText: { fontSize: 16, marginBottom: 5, color: '#444' },
  detailText: { fontSize: 14, color: '#666', lineHeight: 22, marginTop: 5 },
  processedImageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  processedImage: {
    width: '48%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  reportPreviewBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reportPreviewTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  reportPreviewText: { fontSize: 13, color: '#555', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  planBox: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  planText: { color: '#333' },
  reportOptionBox: { marginBottom: 12 },
  optionTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginBottom: 8,
  },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    backgroundColor: '#F8FBFF',
  },
  optionChipActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  optionChipText: { color: '#2196F3', fontWeight: '600' },
  optionChipTextActive: { color: 'white' },
  btnCalendar: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDownload: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnRetry: { alignItems: 'center', padding: 10 },
});
