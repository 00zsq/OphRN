import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { AppToast } from '../../components/Toast';
import { assertSuccess, patientApi } from '../../api';
import { getCurrentUser, setCurrentUser } from '../../store/user';

const SectionCard = ({ title, children, color = '#2196F3' }: any) => (
  <View style={styles.card}>
    <View style={[styles.cardHeader, { borderLeftColor: color }]}>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

export default function PatientProfile() {
  const currentUser: any = useMemo(() => getCurrentUser() || {}, []);
  const [patientInfo, setPatientInfo] = useState<any>(currentUser.patient || {});
  const [password, setPassword] = useState('');
  const [idCard, setIdCard] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [name, setName] = useState(currentUser.name || currentUser.username || '');

  useEffect(() => {
    let cancelled = false;

    const loadPatientInfo = async () => {
      const patientId = Number(currentUser.patientId || currentUser.userId || currentUser.id);
      if (!patientId) return;

      try {
        const patient = currentUser.patient || {
          id: patientId,
          name: currentUser.name || currentUser.username || '',
          idCard: currentUser.idCard || '',
          age: currentUser.age,
          sex: currentUser.sex || currentUser.gender || '',
        };
        if (cancelled) return;

        setPatientInfo(patient);
        setName(patient.name || currentUser.username || '');
        setIdCard(patient.idCard || '');
        setAge(patient.age ? String(patient.age) : '');
        setGender(patient.sex || '');
      } catch (error) {
        console.warn('Load patient info failed:', error);
      }
    };

    loadPatientInfo();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const handleSavePassword = async () => {
    if (!password.trim()) {
      AppToast.show('请输入新密码', 'error');
      return;
    }

    try {
      const result = await patientApi.update({
        username: currentUser.username,
        password,
      });
      assertSuccess(result);
      AppToast.show('密码修改成功', 'success');
      setPassword('');
    } catch (error) {
      console.warn('Save password failed:', error);
      AppToast.show(error instanceof Error ? error.message : '密码修改失败', 'error');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const nextPatient = {
        id: patientInfo.id || currentUser.patientId || currentUser.userId || currentUser.id,
        name,
        idCard,
        age: Number(age) || undefined,
        sex: gender,
      };

      const result = await patientApi.bind(nextPatient);
      assertSuccess(result);
      await setCurrentUser({
        ...currentUser,
        patient: nextPatient,
        patientId: nextPatient.id,
        name: nextPatient.name,
        idCard: nextPatient.idCard,
        age: nextPatient.age,
        sex: nextPatient.sex,
      });
      setPatientInfo(nextPatient);

      AppToast.show('个人信息保存成功', 'success');
    } catch (error) {
      console.warn('Save profile failed:', error);
      AppToast.show(error instanceof Error ? error.message : '个人信息保存失败', 'error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 头部展示区 */}
      <ImageBackground
        source={require('../../assets/bgimg.jpg')}
        style={styles.headerBg}
        imageStyle={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{(name || currentUser.username || '患').slice(0, 1)}</Text>
          </View>
          <Text style={styles.nameText}>{name || currentUser.username || '患者'}</Text>
        </View>
      </ImageBackground>

      <View style={styles.body}>
        {/* 1. 密码修改 */}
        <SectionCard title="密码修改" color="#673AB7">
          <View style={styles.formItem}>
            <Text style={styles.label}>新密码</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="请输入新密码"
            />
          </View>
          <TouchableOpacity style={styles.btnSave} onPress={handleSavePassword}>
            <Text style={styles.btnText}>保存密码</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* 2. 基础信息编辑 */}
        <SectionCard title="基础信息维护" color="#2196F3">
          <View style={styles.formItem}>
            <Text style={styles.label}>姓名</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.formRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>年龄</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>性别</Text>
              <TextInput
                style={styles.input}
                value={gender}
                onChangeText={setGender}
              />
            </View>
          </View>
          <View style={styles.formItem}>
            <Text style={styles.label}>身份证号</Text>
            <TextInput
              style={styles.input}
              value={idCard}
              onChangeText={setIdCard}
            />
          </View>
          <TouchableOpacity style={styles.btnSave} onPress={handleSaveProfile}>
            <Text style={styles.btnText}>保存个人信息</Text>
          </TouchableOpacity>
        </SectionCard>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f5f5f5', flexGrow: 1 },
  // Header
  headerBg: { width: '100%', height: 220, justifyContent: 'center' },
  headerContent: { alignItems: 'center', marginTop: 20 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'white',
    marginBottom: 10,
    backgroundColor: '#673AB7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  nameText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  tagText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  // Body
  body: { padding: 15, paddingBottom: 30, marginTop: -30 },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 15,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardContent: {},

  // Form Styles
  formRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  inputGroup: { flex: 1, marginBottom: 15 },
  formItem: { marginBottom: 15 },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 15,
  },
  btnSave: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

});
