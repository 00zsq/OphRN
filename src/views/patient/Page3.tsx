import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export default function Page3({ navigation }: any) {
  // 菜单配置
  const menus = [
    {
      title: '个人档案',
      desc: '修改密码、完善资料',
      route: 'PatientProfile',
      color: '#FF9800',
    },
    {
      title: '智能诊断',
      desc: '上传照片、查看报告',
      route: 'PatientDiagnosis',
      color: '#2196F3',
    },
    {
      title: '预约医生',
      desc: '专家预约、管理挂号',
      route: 'PatientAppointment',
      color: '#4CAF50',
    },
    {
      title: 'AI 咨询',
      desc: '眼科问题智能解答',
      route: 'PatientAIChat',
      color: '#9C27B0',
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>欢迎回来，Patient</Text>
        <Text style={styles.subText}>请选择您需要的服务</Text>
      </View>

      <View style={styles.grid}>
        {menus.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Text style={[styles.cardTitle, { color: item.color }]}>
              {item.title}
            </Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f9f9f9', flexGrow: 1 },
  header: { marginBottom: 30 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subText: { fontSize: 16, color: '#666', marginTop: 5 },
  grid: { flexDirection: 'column', gap: 15 },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    marginBottom: 15,
    borderLeftWidth: 5,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  cardDesc: { fontSize: 14, color: '#888' },
});
