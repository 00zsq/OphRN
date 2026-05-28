import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { setCurrentUser } from '../store/user';
import { AppToast } from '../components/Toast';
import { patientApi, userApi } from '../api';
import { setAuthToken } from '../api/client';

// 背景图路径需要调整层级
const bgImg = require('../assets/HomebgImg.png');

export default function Home({ navigation }: any) {
  const [role, setRole] = useState<'admin' | 'doctor' | 'patient' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!role || !username || !password) {
      AppToast.show('请选择角色并输入用户名、密码', 'error');
      return;
    }

    try {
      const result: any =
        role === 'patient'
          ? await patientApi.login({ username, password })
          : await userApi.login({ username, password });

      // 编码：1成功，0和其他数字为失败
      if (result.code !== 1) {
        throw new Error(result.msg || '登录失败');
      }

      const data = result.data || {};
      const actualRole = String(data.role || '').toUpperCase();
      if (role === 'admin' && actualRole !== 'ADMIN') {
        throw new Error('非管理员，无法登录管理员端');
      }

      const token = data.token || '';
      if (token) {
        setAuthToken(token);
      }

      const apiUser = {
        ...data,
        id: data.userId || data.id,
        userId: data.userId || data.id,
        username: data.username || username,
        name: data.name || data.username || username,
        role: data.role || role,
      };

      setCurrentUser(apiUser, token);
      setUsername('');
      setPassword('');
      setRole(null);

      // 根据实际角色分配跳转，目前先按用户选定的 role
      if (role === 'admin') navigation.navigate('Page1');
      else if (role === 'doctor') navigation.navigate('Page2');
      else navigation.navigate('Page3');
    } catch (error: any) {
      console.error('API login failed:', error);
      AppToast.show(error?.message || String(error) || '网络请求失败', 'error');
    }
  };

  // 角色卡片：纯白卡，标题艺术化（大字号 + 字间距），副标题次要
  const RoleCard = ({
    title,
    subtitle,
    accent,
    onPress,
  }: {
    title: string;
    subtitle: string;
    accent: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.roleCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.roleTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.roleSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const renderLoginButtons = () => (
    <View style={styles.roleWrap}>
      <View style={styles.brandWrap}>
        <Text style={styles.titleText}>欢迎使用 OphRN</Text>
        <Text style={styles.subtitleText}>智能眼底诊断 · 请选择角色登录</Text>
      </View>

      <RoleCard
        title="管理员"
        subtitle="后台数据管理与审核"
        accent="#1976d2"
        onPress={() => setRole('admin')}
      />
      <RoleCard
        title="医生"
        subtitle="诊断审核与报告生成"
        accent="#00897b"
        onPress={() => setRole('doctor')}
      />
      <RoleCard
        title="患者"
        subtitle="眼底上传与历史报告"
        accent="#5e35b1"
        onPress={() => setRole('patient')}
      />
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.card}>
      <Text style={styles.titleText}>
        {role === 'admin' ? '管理员' : role === 'doctor' ? '医生' : '患者'}登录
      </Text>
      <Text style={styles.subtitleText}>请输入账号信息</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="请输入用户名"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor="#9aa0a6"
        />
        <TextInput
          style={styles.input}
          placeholder="请输入密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleLogin}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>登 录</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => {
          setRole(null);
          setUsername('');
          setPassword('');
        }}
      >
        <Text style={styles.linkText}>返回角色选择</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground
      source={bgImg}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {!role ? renderLoginButtons() : renderLoginForm()}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  // 卡片样式
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 28,
    shadowColor: '#1f3b6d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },

  // 角色选择不需要外层白卡，直接呈现在背景上，避免出现"白框套白框"
  roleWrap: { width: '100%' },

  brandWrap: { alignItems: 'center', marginBottom: 22 },

  titleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1f23',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 18,
    textAlign: 'center',
  },

  // 角色卡片：纯白卡，标题艺术化
  roleCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
  },
  roleSubtitle: {
    fontSize: 12,
    color: '#9aa0a6',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 1,
  },

  // 登录主按钮
  primaryBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 4 },

  // 输入框样式
  inputContainer: { width: '100%', marginBottom: 6 },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#f4f6f8',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 15,
    color: '#1c1f23',
    borderWidth: 1,
    borderColor: '#e3e6ea',
  },

  // 链接按钮样式
  linkBtn: { marginTop: 14, padding: 6, alignItems: 'center' },
  linkText: { color: '#5f6368', fontSize: 13 },
});
