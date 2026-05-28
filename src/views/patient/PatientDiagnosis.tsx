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
import ReactNativeBlobUtil from 'react-native-blob-util';

type ReportLanguage = 'ZH' | 'EN';
type ReportFormat = 'pdf' | 'png' | 'html';
type DiagnosisTab = 'upload' | 'history';

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
import { assertSuccess, guestApi, patientApi, reportApi } from '../../api';
import type { DiagnosisReport } from '../../api/types';
import { getCurrentUser } from '../../store/user';

export default function PatientDiagnosis() {
  const [activeTab, setActiveTab] = useState<DiagnosisTab>('upload');
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
  const [downloadReportFormat, setDownloadReportFormat] = useState<ReportFormat>('pdf');
  const [viewingHistoryReport, setViewingHistoryReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
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
    setActiveTab('history');
    setViewingHistoryReport(true);
    setCurrentResult({
      riskLevel: '',
      disease: '',
      summary: '',
      suggestion: '',
    });
    setProcessedImages([]);
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
        setDownloadReportFormat(format);
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

    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
      },
      response => {
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

    launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: false,
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
      },
      response => {
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

      setProcessedImages([]);
      setReportContent('');
      setFollowUpPlan('');
      setReportRecordId(null);
      setCurrentReportId(null);
      setViewingHistoryReport(false);
      setCurrentResult({
        riskLevel: '分析中...',
        disease: '正在计算',
        summary: 'AI 正在处理图像特征，请稍候...',
        suggestion: '诊断完成后将显示建议',
      });

      // 患者端无权限调用 /dsod/diagnosis/analyze（医生/管理员体系），
      // 这里只走 guest 的 AI 分析接口，结果仅本地展示，不在后端创建诊断记录。
      const guestResult = await guestApi.analyze(leftEyeUri, rightEyeUri);
      if (guestResult.code !== 1) {
        throw new Error(guestResult.msg || 'AI 图像分析失败');
      }

      const guestRecord = Array.isArray((guestResult as any).data)
        ? (guestResult as any).data[0]
        : (guestResult as any).data;
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

      setStatus('finished');
    } catch (error) {
      console.warn('Diagnosis analyze failed:', error);
      const message = error instanceof Error ? error.message : '诊断服务异常，请稍后重试';
      AppToast.show(message, 'error');
      setStatus('idle');
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

  const generateReport = async () => {
    if (!reportRecordId) {
      AppToast.show('暂无诊断记录，无法生成报告', 'error');
      return;
    }

    setGeneratingReport(true);
    try {
      const reportResult = await reportApi.generate(reportRecordId, reportLanguage);
      const report = assertSuccess(reportResult);
      if (report?.id) {
        setCurrentReportId(report.id);
      }
      setDownloadReportFormat(reportFormat);
      const nextReportContent = report?.reportContent || '';
      setReportContent(nextReportContent);
      setFollowUpPlan(extractFollowUpPlan(nextReportContent));
      loadHistoryReports();
      AppToast.show('报告生成成功', 'success');
    } catch (error) {
      console.warn('Generate report failed:', error);
      AppToast.show(error instanceof Error ? error.message : '报告生成失败，请稍后重试', 'error');
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
      // 患者用 patientApi（/dsod/patients/download，token header），不要用医生端 reportApi（authentication header）—— 否则 401
      const fromUrl = patientApi.downloadUrl(currentReportId, downloadReportFormat);
      const headers = patientApi.downloadHeaders() as Record<string, string>;
      const filename = `Report_${currentReportId}_${Date.now()}.${downloadReportFormat}`;
      const mimeMap: Record<ReportFormat, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        html: 'text/html',
      };
      const mime = mimeMap[downloadReportFormat] || 'application/octet-stream';
      console.log('[downloadReport] GET', fromUrl, headers);

      if (Platform.OS === 'android') {
        // Android: DownloadManager，下载完通知栏可见，文件入公共 Downloads 目录
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

        const savedPath = res.path();
        console.log('[downloadReport] saved path', savedPath, 'info', res.info());
        if (savedPath) {
          AppToast.alert('下载完成', `已保存到：\n${savedPath}`);
        } else {
          throw new Error('下载失败：DownloadManager 未返回文件路径');
        }
      } else {
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
            <Text style={styles.btnCalendarText}>同步至手机日历与提醒</Text>
          </TouchableOpacity>

          {!viewingHistoryReport && reportRecordId ? (
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
                    onPress={() => setReportLanguage(item.value)}
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

              <TouchableOpacity
                style={[
                  styles.btnGenerate,
                  generatingReport && { backgroundColor: '#90CAF9' },
                ]}
                onPress={generateReport}
                disabled={generatingReport}
              >
                {generatingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.btnText}>生成{reportLanguage === 'ZH' ? '中文' : '英文'}报告</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {currentReportId ? (
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
                <Text style={styles.btnText}>下载完整 {downloadReportFormat.toUpperCase()} 报告</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.btnRetry}
            onPress={() => {
              const nextTab = viewingHistoryReport ? 'history' : 'upload';
              setStatus('idle');
              setActiveTab(nextTab);
              setLeftEyeUri(null);
              setRightEyeUri(null);
              setProcessedImages([]);
              setReportContent('');
              setFollowUpPlan('');
              setReportRecordId(null);
              setCurrentReportId(null);
              setDownloadReportFormat('pdf');
              setViewingHistoryReport(false);
              loadHistoryReports();
            }}
          >
            <Text style={styles.btnRetryText}>{viewingHistoryReport ? '返回历史报告' : '返回上传诊断'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'upload' && styles.tabActive]}
          onPress={() => setActiveTab('upload')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'upload' && styles.tabTextActive,
            ]}
          >
            上传眼底图像
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.tabTextActive,
            ]}
          >
            历史诊断报告
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'upload' ? (
        <>
          <Text style={styles.headerTitle}>上传眼底图像</Text>
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => handleSelectImage('left')}
              activeOpacity={0.85}
            >
              {leftEyeUri ? (
                <Image source={{ uri: leftEyeUri }} style={styles.thumb} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, color: '#9aa0a6', marginBottom: 4 }}>+</Text>
                  <Text style={styles.placeholder}>左眼</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => handleSelectImage('right')}
              activeOpacity={0.85}
            >
              {rightEyeUri ? (
                <Image source={{ uri: rightEyeUri }} style={styles.thumb} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, color: '#9aa0a6', marginBottom: 4 }}>+</Text>
                  <Text style={styles.placeholder}>右眼</Text>
                </View>
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
        </>
      ) : (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: '#f4f6f8' },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#1976d2' },
  tabText: { color: '#5f6368', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1f23',
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  historyReportCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshText: { color: '#1976d2', fontWeight: '600', fontSize: 13 },
  historyReportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eef0f2',
  },
  historyReportTitle: { fontSize: 15, fontWeight: '700', color: '#1c1f23' },
  historyReportMeta: { fontSize: 12, color: '#7c8189', marginTop: 3 },
  historyReportAction: { color: '#1976d2', fontWeight: '700', fontSize: 13 },
  emptyText: { color: '#9aa0a6', fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  uploadBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f1f3f6',
    borderWidth: 1,
    borderColor: '#e3e6ea',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  placeholder: { fontSize: 16, color: '#5f6368', fontWeight: '600' },
  btnPrimary: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  loadingBox: { alignItems: 'center', marginTop: 24 },

  resultCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1f23',
    marginBottom: 10,
  },
  resultText: { fontSize: 15, marginBottom: 5, color: '#333' },
  detailText: { fontSize: 13, color: '#5f6368', lineHeight: 22, marginTop: 5 },
  processedImageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  processedImage: {
    flex: 1,
    height: 140,
    borderRadius: 10,
    backgroundColor: '#eef0f2',
  },
  reportPreviewBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  reportPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1f23',
    marginBottom: 6,
  },
  reportPreviewText: { fontSize: 13, color: '#5f6368', lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e3e6ea', marginVertical: 18 },
  planBox: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 5,
  },
  planText: { color: '#333', fontSize: 13, lineHeight: 20 },
  reportOptionBox: { marginTop: 4, marginBottom: 8 },
  optionTitle: {
    fontSize: 13,
    color: '#5f6368',
    fontWeight: '600',
    marginBottom: 8,
  },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
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
  // 日历按钮：改成清爽的描边次级按钮，不再用刺眼橙红
  btnCalendar: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  btnCalendarText: { color: '#1976d2', fontSize: 14, fontWeight: '600' },
  btnGenerate: {
    backgroundColor: '#1976d2',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDownload: {
    backgroundColor: '#43a047',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnRetry: { alignItems: 'center', padding: 10 },
  btnRetryText: { color: '#5f6368', fontSize: 13 },
});
