import React, { useState } from 'react';
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
import { DIAGNOSIS_RESULTS_LIST, FOLLOW_UP_PLAN } from '../../data/mockData';
import { AppToast } from '../../components/Toast';
import { diagnosisApi, reportApi } from '../../api';
import { getCurrentUser } from '../../data/users';

// 引入本地 PDF 资源
const reportAsset = require('../../data/report.pdf');

export default function PatientDiagnosis() {
  const [leftEyeUri, setLeftEyeUri] = useState<string | null>(null);
  const [rightEyeUri, setRightEyeUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'diagnosing' | 'finished'>(
    'idle',
  );
  // 新增：用于存储动态计算的复查日期
  const [nextVisitDate, setNextVisitDate] = useState<string>('');

  // 新增：下载状态防止重复点击
  const [downloading, setDownloading] = useState(false);

  // 新增：用于存储本次随机抽取的诊断结果，默认取第一个以防空
  const [currentResult, setCurrentResult] = useState(DIAGNOSIS_RESULTS_LIST[0]);
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);

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

  const startDiagnosis = async () => {
    if (!leftEyeUri || !rightEyeUri) {
      AppToast.show('请先上传双眼照片', 'error');
      return;
    }
    setStatus('diagnosing');

    const randomIndex = Math.floor(
      Math.random() * DIAGNOSIS_RESULTS_LIST.length,
    );
    setCurrentResult(DIAGNOSIS_RESULTS_LIST[randomIndex]);

    const now = new Date();
    now.setMonth(now.getMonth() + 3);

    // 格式化为 YYYY-MM-DD
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const calculatedDate = `${year}-${month}-${day}`;

    setNextVisitDate(calculatedDate);

    try {
      const currentUser = getCurrentUser() || {};
      const patient = {
        id: Number(currentUser.patientId || currentUser.userId || currentUser.id),
        name: currentUser.name || currentUser.username || '患者',
        idCard: currentUser.idCard,
        age: Number(currentUser.age) || undefined,
        sex: currentUser.sex || currentUser.gender,
      };

      const result = await diagnosisApi.analyze(
        [patient],
        [leftEyeUri],
        [rightEyeUri],
      );
      const firstRecord = result.data?.[0];
      const reportOrRecordId = firstRecord
        ? Number(Object.values(firstRecord)[0])
        : NaN;

      if (!Number.isNaN(reportOrRecordId)) {
        setCurrentReportId(reportOrRecordId);
        try {
          const reportResult = await reportApi.generate(reportOrRecordId, 'ZH');
          if (reportResult.data?.id) {
            setCurrentReportId(reportResult.data.id);
          }
        } catch (error) {
          console.warn('Generate report failed:', error);
        }
      }
    } catch (error) {
      console.warn('Diagnosis analyze failed:', error);
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

      // 4. 执行业务逻辑 (使用动态计算的 nextVisitDate)
      AppToast.alert(
        '日程已规划', // 修改提示语，更严谨
        `系统已生成复查计划：\n\n日期：${nextVisitDate}\n事项：${FOLLOW_UP_PLAN.title}\n\n点击“打开日历”将跳转至该日期，请手动点击 + 号添加提醒。`,
        [
          { text: '知道了' },
          {
            text: '打开日历',
            onPress: async () => {
              try {
                // 尝试跳转到特定日期的日历视图
                // 注意：日期字符串转时间戳
                let dateMs = new Date().getTime();
                if (nextVisitDate) {
                  const parts = nextVisitDate.split('-');
                  // 构造为本地时间，避免时区问题导致日期偏差
                  if (parts.length === 3) {
                    dateMs = new Date(
                      parseInt(parts[0]),
                      parseInt(parts[1]) - 1,
                      parseInt(parts[2]),
                    ).getTime();
                  }
                }

                // Android: content://com.android.calendar/time/<ms_since_epoch>
                // iOS: calshow:<seconds_since_epoch>
                const url =
                  Platform.OS === 'android'
                    ? `content://com.android.calendar/time/${dateMs}`
                    : `calshow:${dateMs / 1000}`;

                // 核心修复：移除 canOpenURL 校验，直接 openURL，避免 Android 11+ 误判跳转设置
                await Linking.openURL(url);
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

  const downloadPDF = async () => {
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
              message: 'App需要访问存储空间以保存PDF诊断报告。',
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
          ? `${RNFS.DownloadDirectoryPath}/Report_${Date.now()}.pdf`
          : `${RNFS.DocumentDirectoryPath}/Report_${Date.now()}.pdf`;

      console.log('Start downloading to:', destPath);

      const downloadSource = currentReportId
        ? {
            uri: reportApi.downloadUrl(currentReportId, 'pdf'),
            headers: reportApi.downloadHeaders(),
          }
        : null;

      const source = downloadSource || Image.resolveAssetSource(reportAsset);
      if (!source || !source.uri) {
        throw new Error('无法解析报告文件资源');
      }

      const downloadOptions: RNFS.DownloadFileOptions = {
        fromUrl: source.uri,
        toFile: destPath,
        begin: res => console.log('Download begin', res),
      };

      if ('headers' in source) {
        downloadOptions.headers = source.headers;
      }

      const result = await RNFS.downloadFile(downloadOptions).promise;

      if (result.statusCode === 200) {
        AppToast.show(`保存成功：${destPath}`, 'success');
      } else {
        throw new Error(`下载失败 (Code: ${result.statusCode})`);
      }
    } catch (err: any) {
      console.warn('PDF download error:', err);
      AppToast.show(`下载出错: ${err.message || '未知错误'}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (status === 'finished') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>诊断结果</Text>
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
            建议: {currentResult.suggestion}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>个性化随访计划</Text>
          <View style={styles.planBox}>
            <Text style={styles.planTitle}>{FOLLOW_UP_PLAN.title}</Text>
            <Text style={styles.planText}>
              频率: {FOLLOW_UP_PLAN.frequency}
            </Text>
            {/* 使用动态计算的日期，而不是 mockData 中的静态日期 */}
            <Text style={styles.planText}>建议复查: {nextVisitDate}</Text>
          </View>

          {/* 此按钮触发 addToCalendar */}
          <TouchableOpacity style={styles.btnCalendar} onPress={addToCalendar}>
            <Text style={styles.btnText}>同步至手机日历与提醒</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnDownload,
              downloading && { backgroundColor: '#A5D6A7' },
            ]}
            onPress={downloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.btnText}>下载完整 PDF 报告</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnRetry}
            onPress={() => {
              setStatus('idle');
              setLeftEyeUri(null);
              setRightEyeUri(null);
              setNextVisitDate('');
              setCurrentReportId(null);
            }}
          >
            <Text style={{ color: '#666' }}>重新诊断</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>上传眼底图像</Text>

      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => handleSelectImage('left')} // 修改此处调用
        >
          {leftEyeUri ? (
            <Image source={{ uri: leftEyeUri }} style={styles.thumb} />
          ) : (
            <Text style={styles.placeholder}>+ 左眼</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => handleSelectImage('right')} // 修改此处调用
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

  // 结果页样式
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
