import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';

interface Props {
  visible: boolean;
  data: any;
  onClose: () => void;
  onSave: (id: string, advice: string, nextStep: string) => void;
}

export const ReviewModal = ({ visible, data, onClose, onSave }: Props) => {
  const [advice, setAdvice] = useState('');
  const [nextStep, setNextStep] = useState('');

  // 当弹窗打开或数据变化时，初始化表单
  useEffect(() => {
    if (visible && data) {
      setAdvice(data.doctorAdvice || data.aiResult.suggestion);
      setNextStep(data.nextStep || '建议定期复查。');
    }
  }, [visible, data]);

  const handleSave = () => {
    if (data) {
      onSave(data.id, advice, nextStep);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>诊断报告审核</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>取消</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {data && (
            <>
              <Text style={styles.sectionTitle}>1. 眼底影像检查</Text>
              <Image
                source={
                  typeof data.image === 'string'
                    ? { uri: data.image }
                    : data.image
                }
                style={styles.largeImage}
                resizeMode="contain"
              />

              <Text style={styles.sectionTitle}>2. AI 智能分析</Text>
              <View style={styles.aiBox}>
                <Text style={styles.aiText}>
                  <Text style={{ fontWeight: 'bold' }}>病灶识别: </Text>
                  {data.aiResult.summary}
                </Text>
                <Text style={styles.aiText}>
                  <Text style={{ fontWeight: 'bold' }}>置信度: </Text>96.5%
                </Text>
              </View>

              <Text style={styles.sectionTitle}>3. 医生审核意见 (可编辑)</Text>
              <Text style={styles.inputLabel}>治疗建议:</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={advice}
                onChangeText={setAdvice}
              />
              <Text style={styles.inputLabel}>后续诊疗方案:</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={nextStep}
                onChangeText={setNextStep}
              />
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>确认并在云端生成报告</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 30, // 避让刘海
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  closeText: { fontSize: 16, color: '#007AFF' },
  modalContent: { padding: 16, flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    paddingLeft: 8,
  },
  largeImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  aiBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  aiText: { fontSize: 14, color: '#444', marginBottom: 6, lineHeight: 22 },
  inputLabel: { fontSize: 14, color: '#666', marginBottom: 4, marginTop: 10 },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 30,
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
