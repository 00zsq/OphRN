import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import { AppToast } from '../../components/Toast';
import { getCurrentUser } from '../../data/users';
import { patientApi } from '../../api';

export default function PatientProfile() {
  const currentUser = getCurrentUser() || {};
  // 直接从 user 对象获取数据，如果不存在则赋在空数组
  const {
    medicalHistory = [],
    treatments = [],
    doctorOrders = [],
  } = currentUser;

  // 编辑态 State - 初始化使用当前登录用户信息
  const [password, setPassword] = useState(currentUser.password || '123456');
  const [idCard, setIdCard] = useState(currentUser.idCard || '');
  const [age, setAge] = useState(currentUser.age || '');
  const [gender, setGender] = useState(currentUser.gender || '');
  const [phone, setPhone] = useState(currentUser.phone || '');

  const handleSave = async () => {
    try {
      if (currentUser.username) {
        await patientApi.update({
          id: currentUser.id,
          username: currentUser.username,
          password,
          patientId: currentUser.patientId,
        });
      }

      await patientApi.bind({
        id: currentUser.patientId,
        name: currentUser.name,
        idCard,
        age: Number(age) || undefined,
        sex: gender,
      });

      AppToast.show('保存成功：您的个人资料已更新', 'success');
    } catch (error) {
      console.warn('Save profile failed:', error);
      AppToast.show('资料已在本地更新，云端同步失败', 'info');
    }
  };

  // 渲染通用卡片容器
  const SectionCard = ({ title, children, color = '#2196F3' }: any) => (
    <View style={styles.card}>
      <View style={[styles.cardHeader, { borderLeftColor: color }]}>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 头部展示区 */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        }}
        style={styles.headerBg}
        imageStyle={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View style={styles.headerContent}>
          <Image
            source={{
              uri:
                currentUser.avatar ||
                'https://randomuser.me/api/portraits/lego/1.jpg',
            }}
            style={styles.avatar}
          />
          <Text style={styles.nameText}>{currentUser.name || '未登录'}</Text>
          {/* 移除黄金会员展示 */}
        </View>
      </ImageBackground>

      <View style={styles.body}>
        {/* 1. 基础信息编辑 */}
        <SectionCard title="基础信息维护" color="#2196F3">
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
          <View style={styles.formItem}>
            <Text style={styles.label}>联系电话</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.formItem}>
            <Text style={styles.label}>登录密码</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={false} // 模拟不可直接修改密码，提示
            />
          </View>
          <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
            <Text style={styles.btnText}>保存修改</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* 2. 个人病史 */}
        <SectionCard title="个人病史 (Medical History)" color="#FF9800">
          {medicalHistory &&
            medicalHistory.map((item: any, index: number) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.historyCondition}>{item.condition}</Text>
                  <Text style={styles.historyStatus}>
                    当前状态: {item.status}
                  </Text>
                </View>
              </View>
            ))}
        </SectionCard>

        {/* 3. 医嘱 */}
        <SectionCard title="特别医嘱 (Doctor's Orders)" color="#E91E63">
          {doctorOrders &&
            doctorOrders.map((order: any, index: number) => (
              <View key={index} style={styles.orderBox}>
                <View style={[styles.orderTag, { backgroundColor: '#FCE4EC' }]}>
                  <Text style={{ color: '#C2185B', fontSize: 12 }}>
                    {order.tag}
                  </Text>
                </View>
                <Text style={styles.orderText}>{order.content}</Text>
              </View>
            ))}
        </SectionCard>

        {/* 4. 治疗记录 - 与医生和预约对齐 */}
        <SectionCard title="近期治疗记录" color="#4CAF50">
          {treatments &&
            treatments.map((t: any, index: number) => (
              <View key={index} style={styles.treatItem}>
                <View style={styles.treatHeader}>
                  <Text style={styles.treatDate}>{t.date}</Text>
                  <Text style={styles.treatHospital}>{t.hospital}</Text>
                </View>
                <Text style={styles.treatTitle}>
                  {t.item}{' '}
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    | {t.doctor}
                  </Text>
                </Text>
                <Text style={styles.treatResult}>{t.result}</Text>
              </View>
            ))}
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
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'white',
    marginBottom: 10,
  },
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

  // History List
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateBadge: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  dateText: { color: '#FF9800', fontWeight: 'bold', fontSize: 12 },
  historyCondition: { fontSize: 16, color: '#333', fontWeight: '600' },
  historyStatus: { fontSize: 13, color: '#888', marginTop: 2 },

  // Doctor Orders
  orderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  orderTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
  },
  orderText: { flex: 1, lineHeight: 20, color: '#444' },

  // Treatments
  treatItem: {
    marginBottom: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    paddingLeft: 15,
    marginLeft: 5,
  },
  treatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  treatDate: { fontSize: 12, color: '#999' },
  treatHospital: { fontSize: 12, color: '#2196F3', fontWeight: 'bold' },
  treatTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  treatResult: { fontSize: 13, color: '#555', fontStyle: 'italic' },
});
