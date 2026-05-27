import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { USERS } from '../../data/users';
import { AppToast } from '../../components/Toast';
import { getMockLogs } from '../../data/mockData';
import { manageApi } from '../../api';

// 定义统一的用户展示接口
interface UnifiedUser {
  id: string; // 唯一标识，部分使用用户名代替
  username: string;
  name: string;
  role: '管理员' | '医生' | '患者';
  info?: string; // 额外信息展示，如专科或电话
}

export default function Page1() {
  const [searchText, setSearchText] = useState('');
  const [remoteUsers, setRemoteUsers] = useState<UnifiedUser[]>([]);

  // 整合本地演示数据，用作接口不可用时的降级数据
  const fallbackUsers: UnifiedUser[] = useMemo(() => {
    const list: UnifiedUser[] = [];

    // 1. 添加管理员
    if (USERS.admin) {
      list.push({
        id: 'admin_001',
        username: USERS.admin.username,
        name: USERS.admin.name,
        role: '管理员',
      });
    }

    // 2. 添加单例医生
    if (USERS.doctor) {
      list.push({
        id: 'doc_main',
        username: USERS.doctor.username,
        name: USERS.doctor.name,
        role: '医生',
        info: USERS.doctor.specialty,
      });
    }

    // 3. 添加医生列表
    if (USERS.doctor_list) {
      USERS.doctor_list.forEach((doc: any) => {
        list.push({
          id: doc.id,
          username: doc.id, // 医生列表暂无独立username，用id代替
          name: doc.name,
          role: '医生',
          info: doc.specialty,
        });
      });
    }

    // 4. 添加患者列表
    if (USERS.patients) {
      USERS.patients.forEach((pat: any, index: number) => {
        list.push({
          id: `pat_${index + 100}`, // 生成一个伪ID
          username: pat.username,
          name: pat.name,
          role: '患者',
          info: pat.phone,
        });
      });
    }

    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const [userResult, patientResult] = await Promise.all([
          manageApi.allUsers({ page: 1, pageSize: 100 }),
          manageApi.allPatients({ page: 1, pageSize: 100 }),
        ]);

        const users = (userResult.data?.records || []).map((item: any) => ({
          id: String(item.id || item.username),
          username: item.username || '-',
          name: item.username || '-',
          role:
            item.role === 'ADMIN'
              ? '管理员'
              : item.role === 'DOCTOR'
              ? '医生'
              : '患者',
          info: item.email || item.createTime,
        })) as UnifiedUser[];

        const patients = (patientResult.data?.records || []).map(
          (item: any) =>
            ({
              id: String(item.id || item.idCard || item.name),
              username: item.idCard || '-',
              name: item.name || '-',
              role: '患者',
              info: `${item.sex || ''} ${item.age ? `${item.age}岁` : ''}`.trim(),
            } as UnifiedUser),
        );

        if (!cancelled && (users.length || patients.length)) {
          setRemoteUsers([...users, ...patients]);
        }
      } catch (error) {
        console.warn('Load users failed:', error);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const allUsers = remoteUsers.length ? remoteUsers : fallbackUsers;

  // 搜索过滤逻辑
  const filteredData = allUsers.filter(
    u =>
      u.id.toLowerCase().includes(searchText.toLowerCase()) ||
      u.name.includes(searchText) ||
      u.username.includes(searchText),
  );

  // 统计逻辑
  const stats = {
    total: allUsers.length,
    admin: allUsers.filter(u => u.role === '管理员').length,
    doctor: allUsers.filter(u => u.role === '医生').length,
    patient: allUsers.filter(u => u.role === '患者').length,
  };

  const handleEdit = (item: UnifiedUser) => {
    AppToast.alert('用户管理', `当前操作对象：${item.name} (ID: ${item.id})`, [
      {
        text: '查看日志',
        onPress: () => {
          // 根据用户角色和姓名获取特定日志
          const numericId = Number(item.id);
          if (!Number.isNaN(numericId)) {
            manageApi
              .operateLog({ userId: numericId, page: 1, pageSize: 10 })
              .then(result => {
                const records = result.data?.records || [];
                const logs = records.length
                  ? records
                      .map((log: any) =>
                        [
                          log.operateTime || log.createTime || log.time,
                          log.methodName || log.operation || log.content,
                        ]
                          .filter(Boolean)
                          .join('  '),
                      )
                      .join('\n\n')
                  : getMockLogs(item.role, item.name).join('\n\n');

                AppToast.alert(`${item.name} 的操作日志`, logs, [
                  { text: '关闭' },
                ]);
              })
              .catch(() => {
                const logs = getMockLogs(item.role, item.name).join('\n\n');
                AppToast.alert(`${item.name} 的操作日志`, logs, [
                  { text: '关闭' },
                ]);
              });
            return;
          }

          const logs = getMockLogs(item.role, item.name).join('\n\n');
          setTimeout(() => {
            AppToast.alert(`${item.name} 的操作日志`, logs, [{ text: '关闭' }]);
          }, 300);
        },
      },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: UnifiedUser }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.name}>{item.name}</Text>
          <View
            style={[
              styles.roleTag,
              item.role === '管理员'
                ? styles.bgAdmin
                : item.role === '医生'
                ? styles.bgDoc
                : styles.bgPat,
            ]}
          >
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleEdit(item)}>
          <Text style={styles.editLink}>管理</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>用户 ID :</Text>
        <Text style={styles.value}>{item.id}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>用户名 :</Text>
        <Text style={styles.value}>{item.username}</Text>
      </View>
      {item.info ? (
        <View style={styles.infoRow}>
          <Text style={styles.label}>详细信息:</Text>
          <Text style={styles.value}>{item.info}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 顶部统计面板 */}
      <View style={styles.statsPanel}>
        <Text style={styles.statsTitle}>系统用户概览</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.doctor}</Text>
            <Text style={styles.statLabel}>医生</Text>
          </View>
          <View style={styles.vline} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.patient}</Text>
            <Text style={styles.statLabel}>患者</Text>
          </View>
          <View style={styles.vline} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.admin}</Text>
            <Text style={styles.statLabel}>管理员</Text>
          </View>
        </View>
      </View>

      {/* 搜索栏 */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="搜索姓名、用户名或ID"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* 用户列表 */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 16 },

  // 统计样式
  statsPanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  vline: { width: 1, height: 24, backgroundColor: '#eee' },

  // 搜索样式
  searchBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: { fontSize: 14, padding: 0 },

  // 列表卡片样式
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  roleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  bgAdmin: { backgroundColor: '#333' },
  bgDoc: { backgroundColor: '#007AFF' },
  bgPat: { backgroundColor: '#34C759' },
  editLink: { color: '#007AFF', fontSize: 14 },

  infoRow: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 70, color: '#888', fontSize: 13 },
  value: { flex: 1, color: '#444', fontSize: 13 },
});
