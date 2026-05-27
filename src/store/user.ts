import { clearAuthToken, setAuthToken } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'currentUser';

let currentUser: any = null;

// 初始化时从本地加载用户数据（应用启动时调用）
export const loadCurrentUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (userStr) {
      currentUser = JSON.parse(userStr);
    }
  } catch (error) {
    console.warn('Load user failed:', error);
  }
  return currentUser;
};

// 设置用户信息并持久化到本地
export const setCurrentUser = async (user: any, token?: string) => {
  currentUser = user;
  if (token) {
    setAuthToken(token);
  }
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('Save user failed:', error);
  }
};

// 获取当前用户（同步）
export const getCurrentUser = () => currentUser;

// 清除用户信息并删除本地存储
export const clearCurrentUser = async () => {
  currentUser = null;
  clearAuthToken();
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.warn('Clear user failed:', error);
  }
};
