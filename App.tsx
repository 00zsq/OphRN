import 'react-native-gesture-handler';
import React from 'react';
import AppNavigator from './src/routes';
import { ToastComponent } from './src/components/Toast';

export default function App() {
  return (
    <>
      <AppNavigator />
      <ToastComponent />
    </>
  );
}
