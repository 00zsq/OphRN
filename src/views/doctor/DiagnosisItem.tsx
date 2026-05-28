import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

interface Props {
  item: any;
  onReviewPress: (item: any) => void;
}

export const DiagnosisItem = ({ item, onReviewPress }: Props) => {
  const isLowRisk = item.aiResult.riskLevel === '低风险';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.pName}>{item.patientName}</Text>
          <Text style={styles.pDetail}>
            {item.gender} | {item.age}岁
          </Text>
        </View>
        <View
          style={[
            styles.tag,
            item.status === 'reviewed' ? styles.tagSuccess : styles.tagWarn,
          ]}
        >
          <Text style={styles.tagText}>
            {item.status === 'reviewed' ? '已审核' : '待审核'}
          </Text>
        </View>
      </View>

      {item.processedImages?.length ? (
        <View style={styles.imageRow}>
          {item.processedImages.map((uri: string, index: number) => (
            <Image key={`${uri}_${index}`} source={{ uri }} style={styles.resultImage} />
          ))}
        </View>
      ) : null}

      <View style={styles.contentRow}>
        <View style={styles.metaLine}>
          {item.idCard ? (
            <Text style={styles.metaText} numberOfLines={1}>
              身份证: {item.idCard}
            </Text>
          ) : null}
          <Text style={styles.metaText}>
            风险等级:{' '}
            <Text style={[styles.riskValue, isLowRisk ? styles.riskLow : styles.riskHigh]}>
              {item.aiResult.riskLevel}
            </Text>
          </Text>
        </View>
        <Text style={styles.aiDisease} numberOfLines={1}>
          左眼: {item.aiResult.leftDisease || item.aiResult.disease}
        </Text>
        <Text style={styles.aiDisease} numberOfLines={1}>
          右眼: {item.aiResult.rightDisease || item.aiResult.disease}
        </Text>
        <Text style={styles.date}>诊断时间: {item.date}</Text>
      </View>

      {item.status === 'reviewed' ? (
        <View style={styles.reviewResult}>
          <Text style={styles.label}>医生意见:</Text>
          <Text style={styles.value} numberOfLines={2}>
            {item.doctorAdvice}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onReviewPress(item)}
        >
          <Text style={styles.btnText}>更新病例</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  patientInfo: {},
  pName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  pDetail: { fontSize: 13, color: '#888', marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagWarn: { backgroundColor: '#FFF3E0' },
  tagSuccess: { backgroundColor: '#E8F5E9' },
  tagText: { fontSize: 12, color: '#F57C00' },
  imageRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  resultImage: {
    flex: 1,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  contentRow: { marginBottom: 12, gap: 5 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaText: { color: '#888', fontSize: 12 },
  riskValue: { fontSize: 12, fontWeight: 'bold' },
  riskLow: { color: '#34C759' },
  riskHigh: { color: '#D32F2F' },
  aiDisease: { fontSize: 13, color: '#666', lineHeight: 20 },
  date: { fontSize: 12, color: '#999' },
  actionBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  reviewResult: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  label: { fontSize: 12, color: '#888', marginBottom: 2 },
  value: { fontSize: 13, color: '#333' },
});
