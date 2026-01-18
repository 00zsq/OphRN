import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// 引入页面组件
import Home from '../views/Home';
import Page1 from '../views/admin/Page1';
import Page2 from '../views/doctor/Page2';
import Page3 from '../views/patient/Page3';
import PatientProfile from '../views/patient/PatientProfile';
import PatientDiagnosis from '../views/patient/PatientDiagnosis';
import PatientAppointment from '../views/patient/PatientAppointment';
import PatientAIChat from '../views/patient/PatientAIChat';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#eee',
            elevation: 0, // 去除安卓阴影
            shadowOpacity: 0, // 去除iOS阴影
          },
          headerTitleAlign: 'center', // 标题居中
        }}
      >
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ headerShown: false }} // 首页隐藏顶部导航栏，展示全屏背景
        />
        <Stack.Screen
          name="Page1"
          component={Page1}
          options={{ title: '管理员控制台' }}
        />
        <Stack.Screen
          name="Page2"
          component={Page2}
          options={{ title: '医生工作站' }}
        />
        <Stack.Screen
          name="Page3"
          component={Page3}
          options={{ title: '患者中心' }}
        />
        {/* 新增患者功能子路由 */}
        <Stack.Screen
          name="PatientProfile"
          component={PatientProfile}
          options={{ title: '个人信息管理' }}
        />
        <Stack.Screen
          name="PatientDiagnosis"
          component={PatientDiagnosis}
          options={{ title: '眼底智能诊断' }}
        />
        <Stack.Screen
          name="PatientAppointment"
          component={PatientAppointment}
          options={{ title: '医生预约' }}
        />
        <Stack.Screen
          name="PatientAIChat"
          component={PatientAIChat}
          options={{ title: '智能医疗咨询' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
