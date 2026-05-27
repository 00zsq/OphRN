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
import { setAuthToken, request } from '../api/client';

// 背景图路径需要调整层级
const bgImg = require('../assets/bgimg.jpg');

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
      // TODO: 目前暂时将所有角色的登录统一指向新的 login 接口，这可以根据后端实际情况调整
      // 替换为真实数据，现在使用统一的 /dsod/users/login 接口 (返回 code: 1 为成功)
      const result: any = await request('/dsod/users/login', {
        method: 'POST',
        body: { username, password },
        skipAuth: true, // 登录接口不需要带 auth header
      });

      // 编码：1成功，0和其他数字为失败
      if (result.code !== 1) {
        throw new Error(result.msg || '登录失败');
      }

      const data = result.data || {};
      const token = data.token || '';
      if (token) {
        setAuthToken(token);
      }

      const apiUser = {
        ...data,
        username: data.username || username,
        name: data.username || username, // TODO: 用 "ct" 占位？ "ct" 这里暂时作为 name
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

  // 自定义按钮组件
  const CustomButton = ({ title, onPress, color = '#2196F3' }: any) => (
    <TouchableOpacity
      style={[styles.customBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderLoginButtons = () => (
    <View style={styles.card}>
      <Text style={styles.titleText}>欢迎使用 OphRN</Text>
      <Text style={styles.subtitleText}>请选择角色登录</Text>

      <CustomButton
        title="管理员登录"
        onPress={() => setRole('admin')}
        color="#72d175ff"
      />
      <CustomButton
        title="医生登录"
        onPress={() => setRole('doctor')}
        color="#5ba8e7ff"
      />
      <CustomButton
        title="患者登录"
        onPress={() => setRole('patient')}
        color="#dfb16cff"
      />
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.card}>
      <Text style={styles.titleText}>
        {role === 'admin' ? '管理员' : role === 'doctor' ? '医生' : '患者'}通道
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="请输入用户名"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="请输入密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />
      </View>

      <CustomButton title="登 录" onPress={handleLogin} color="#673AB7" />
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 卡片样式
  card: {
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // 白色背景，微透明
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  titleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitleText: { fontSize: 16, color: '#666', marginBottom: 20 },

  // 按钮样式
  customBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // 输入框样式
  inputContainer: { width: '100%', marginBottom: 10 },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },

  // 链接按钮样式
  linkBtn: { marginTop: 10, padding: 5 },
  linkText: { color: '#666', textDecorationLine: 'underline' },
});
