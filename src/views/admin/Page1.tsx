import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { AppToast } from '../../components/Toast';
import { manageApi, userApi, type UserRole } from '../../api';

// 定义统一的用户展示接口
interface UnifiedUser {
  id: string; // 唯一标识，部分使用用户名代替
  username: string;
  name: string;
  role: '管理员' | '医生' | '医护' | '患者' | '机构' | '科研人员';
  roleValue: UserRole;
  email: string;
  password?: string;
  status?: number;
  createTime?: string;
  info?: string; // 额外信息展示，如邮箱、状态、创建时间
}

interface OperateLog {
  id: string;
  userId: string;
  operateTime: string;
  className: string;
  methodName: string;
  methodParams: string;
  returnValue: string;
  costTime: string;
}

const roleTextMap: Record<UserRole, UnifiedUser['role']> = {
  ADMIN: '管理员',
  DOCTOR: '医生',
  HEALTHCARE: '医护',
  INSTITUTION: '机构',
  RESEARCHER: '科研人员',
};

const roleOptions: Array<{ label: UnifiedUser['role']; value: UserRole }> = [
  { label: '管理员', value: 'ADMIN' },
  { label: '医生', value: 'DOCTOR' },
  { label: '医护', value: 'HEALTHCARE' },
  { label: '机构', value: 'INSTITUTION' },
  { label: '科研人员', value: 'RESEARCHER' },
];

const toOperateLog = (item: any): OperateLog => ({
  id: String(item.id || ''),
  userId: String(item.userId || ''),
  operateTime: item.operateTime || '',
  className: item.className || '',
  methodName: item.methodName || '',
  methodParams: item.methodParams || '',
  returnValue: String(item.returnValue ?? ''),
  costTime: item.costTime !== undefined ? `${item.costTime}ms` : '',
});

const toUnifiedUser = (item: any): UnifiedUser => {
  return {
    id: String(item.id || item.username || ''),
    username: item.username || '',
    name: item.username || '',
    role: roleTextMap[item.role as UserRole] || '患者',
    roleValue: item.role,
    email: item.email || '',
    password: item.password,
    status: item.status,
    createTime: item.createTime,
  };
};

export default function Page1() {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [searchText, setSearchText] = useState('');
  const [logSearchText, setLogSearchText] = useState('');
  const [remoteUsers, setRemoteUsers] = useState<UnifiedUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userLoadingMore, setUserLoadingMore] = useState(false);
  const [operateLogs, setOperateLogs] = useState<OperateLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logLoadingMore, setLogLoadingMore] = useState(false);
  const [editingUser, setEditingUser] = useState<UnifiedUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('HEALTHCARE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const trimmedSearchText = searchText.trim();
        const numericSearchId = Number(trimmedSearchText);

        setUserPage(1);

        if (trimmedSearchText && !Number.isNaN(numericSearchId)) {
          const userResult = await manageApi.userById(numericSearchId);
          const user = userResult.data ? [toUnifiedUser(userResult.data)] : [];
          if (!cancelled) {
            setRemoteUsers(user);
            setUserTotal(user.length);
          }
          return;
        }

        const userResult = await manageApi.allUsers({
          username: trimmedSearchText || undefined,
          role: undefined,
          page: 1,
          pageSize: 10,
        });

        const users = (userResult.data?.records || []).map(toUnifiedUser);

        if (!cancelled) {
          setRemoteUsers(users);
          setUserTotal(userResult.data?.total || users.length);
        }
      } catch (error) {
        console.warn('Load users failed:', error);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;

    const loadOperateLogs = async () => {
      if (activeTab !== 'logs') return;

      try {
        const trimmedSearchText = logSearchText.trim();
        const numericUserId = Number(trimmedSearchText);
        setLogPage(1);

        const result = await manageApi.operateLog({
          userId:
            trimmedSearchText && !Number.isNaN(numericUserId)
              ? numericUserId
              : undefined,
          page: 1,
          pageSize: 10,
        });

        if (!cancelled) {
          setOperateLogs((result.data?.records || []).map(toOperateLog));
          setLogTotal(result.data?.total || 0);
        }
      } catch (error) {
        console.warn('Load operate logs failed:', error);
        if (!cancelled) {
          setOperateLogs([]);
          setLogTotal(0);
        }
      }
    };

    loadOperateLogs();

    return () => {
      cancelled = true;
    };
  }, [activeTab, logSearchText]);

  const loadMoreUsers = async () => {
    if (userLoadingMore || searchText.trim() || remoteUsers.length >= userTotal) {
      return;
    }

    setUserLoadingMore(true);
    try {
      const nextPage = userPage + 1;
      const result = await manageApi.allUsers({
        username: undefined,
        role: undefined,
        page: nextPage,
        pageSize: 10,
      });
      const nextUsers = (result.data?.records || []).map(toUnifiedUser);
      setRemoteUsers(users => [...users, ...nextUsers]);
      setUserTotal(result.data?.total || userTotal);
      setUserPage(nextPage);
    } catch (error) {
      console.warn('Load more users failed:', error);
    } finally {
      setUserLoadingMore(false);
    }
  };

  const loadMoreLogs = async () => {
    if (logLoadingMore || operateLogs.length >= logTotal) {
      return;
    }

    setLogLoadingMore(true);
    try {
      const trimmedSearchText = logSearchText.trim();
      const numericUserId = Number(trimmedSearchText);
      const nextPage = logPage + 1;
      const result = await manageApi.operateLog({
        userId:
          trimmedSearchText && !Number.isNaN(numericUserId)
            ? numericUserId
            : undefined,
        page: nextPage,
        pageSize: 10,
      });
      const nextLogs = (result.data?.records || []).map(toOperateLog);
      setOperateLogs(logs => [...logs, ...nextLogs]);
      setLogTotal(result.data?.total || logTotal);
      setLogPage(nextPage);
    } catch (error) {
      console.warn('Load more operate logs failed:', error);
    } finally {
      setLogLoadingMore(false);
    }
  };

  const allUsers = remoteUsers;

  // 搜索过滤逻辑
  const filteredData = allUsers.filter(
    u =>
      u.id.toLowerCase().includes(searchText.toLowerCase()) ||
      u.name.includes(searchText) ||
      u.username.includes(searchText),
  );

  // 统计逻辑
  const stats = {
    total: userTotal,
    admin: allUsers.filter(u => u.role === '管理员').length,
    doctor: allUsers.filter(u => u.role === '医生' || u.role === '医护').length,
    patient: allUsers.filter(u => u.role === '患者').length,
  };

  const openEditModal = (item: UnifiedUser) => {
    setEditingUser(item);
    setEditUsername(item.username);
    setEditEmail(item.email);
    setEditRole(item.roleValue || 'HEALTHCARE');
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingUser(null);
  };

  const updateEditingUser = async (status?: number) => {
    if (!editingUser) return;

    const numericId = Number(editingUser.id);
    if (Number.isNaN(numericId)) {
      AppToast.show('用户 ID 无效，无法保存', 'error');
      return;
    }

    setSaving(true);
    try {
      const nextStatus = status ?? editingUser.status;
      const result = await userApi.updateByAdmin({
        id: numericId,
        username: editUsername.trim(),
        password: editingUser.password,
        role: editRole,
        email: editEmail.trim(),
        status: nextStatus,
        createTime: editingUser.createTime,
      });

      if (result.code !== 1) {
        throw new Error(result.msg || '修改失败');
      }

      const updatedUser = toUnifiedUser({
        ...editingUser,
        id: numericId,
        username: editUsername.trim(),
        password: editingUser.password,
        role: editRole,
        email: editEmail.trim(),
        status: nextStatus,
      });

      setRemoteUsers(users =>
        users.map(user => (user.id === editingUser.id ? updatedUser : user)),
      );
      setEditingUser(null);
      AppToast.show(result.data || '修改成功', 'success');
    } catch (error: any) {
      console.warn('Update user failed:', error);
      AppToast.show(error?.message || '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = () => updateEditingUser();
  const handleDisableUser = () => updateEditingUser(0);

  const renderLogItem = ({ item }: { item: OperateLog }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.logTitleBox}>
          <Text style={styles.name}>{item.methodName || '未知方法'}</Text>
          <Text style={styles.userIdText}>日志 ID：{item.id} ｜ 用户 ID：{item.userId}</Text>
        </View>
        {item.costTime ? <Text style={styles.costTag}>{item.costTime}</Text> : null}
      </View>

      <View style={styles.detailBox}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>时间</Text>
          <Text style={styles.detailValue}>{item.operateTime || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>类名</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.className || '-'}</Text>
        </View>
        <View style={styles.logParamsBox}>
          <Text style={styles.detailLabel}>参数</Text>
          <Text style={styles.logParamsText} numberOfLines={1} ellipsizeMode="tail">
            {item.methodParams || '-'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>返回</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.returnValue || '-'}</Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: UnifiedUser }) => {
    const statusText = item.status === 1 ? '启用' : '停用';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userTitleRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.userIdText}>ID：{item.id}</Text>
            <View
              style={[
                styles.roleTag,
                item.role === '管理员'
                  ? styles.bgAdmin
                  : item.role === '医生' || item.role === '医护'
                  ? styles.bgDoc
                  : styles.bgPat,
              ]}
            >
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Text style={styles.editLink}>管理</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>邮箱</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.email || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>状态</Text>
            <Text
              style={[
                styles.statusValue,
                item.status === 1 ? styles.statusEnabled : styles.statusDisabled,
              ]}
            >
              {statusText}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>创建时间</Text>
            <Text style={styles.detailValue}>{item.createTime || '-'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            用户概览
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
          onPress={() => setActiveTab('logs')}
        >
          <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
            日志查询
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'users' ? (
        <>
          {/* 顶部统计面板 */}
          <View style={styles.statsPanel}>
        <Text style={styles.statsTitle}>系统用户概览</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>总用户</Text>
          </View>
          <View style={styles.vline} />
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
        ListEmptyComponent={<Text style={styles.empty}>暂无用户数据</Text>}
        ListFooterComponent={
          userLoadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null
        }
        onEndReached={loadMoreUsers}
        onEndReachedThreshold={0.2}
        contentContainerStyle={styles.list}
          />
        </>
      ) : (
        <>
        <View style={styles.logHeader}>
          <Text style={styles.statsTitle}>AOP 记录日志</Text>
          <Text style={styles.logTotal}>共 {logTotal} 条</Text>
        </View>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="输入用户ID查询日志"
            value={logSearchText}
            onChangeText={setLogSearchText}
            autoCapitalize="none"
          />
        </View>
        <FlatList
          data={operateLogs}
          keyExtractor={item => item.id}
          renderItem={renderLogItem}
          ListEmptyComponent={<Text style={styles.empty}>暂无日志数据</Text>}
          ListFooterComponent={
            logLoadingMore ? <ActivityIndicator style={styles.loadingMore} /> : null
          }
          onEndReached={loadMoreLogs}
          onEndReachedThreshold={0.2}
          contentContainerStyle={styles.list}
        />
        </>
      )}

      <Modal
        visible={!!editingUser}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>编辑用户信息</Text>
            <Text style={styles.modalSubTitle}>用户 ID：{editingUser?.id}</Text>

            <Text style={styles.modalLabel}>用户名</Text>
            <TextInput
              style={styles.modalInput}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="请输入用户名"
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>邮箱</Text>
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="请输入邮箱"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.modalLabel}>角色</Text>
            <View style={styles.roleOptions}>
              {roleOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.roleOption,
                    editRole === option.value && styles.roleOptionActive,
                  ]}
                  onPress={() => setEditRole(option.value)}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      editRole === option.value && styles.roleOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEditModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.disableButton]}
                onPress={handleDisableUser}
                disabled={saving || editingUser?.status === 0}
              >
                <Text style={styles.saveButtonText}>禁用</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveUser}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', padding: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: '#007AFF' },
  tabText: { color: '#666', fontWeight: 'bold' },
  activeTabText: { color: '#fff' },

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
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  loadingMore: { marginVertical: 16 },
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
  userTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logTitleBox: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  userIdText: { color: '#777', fontSize: 13, marginRight: 8 },
  roleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  bgAdmin: { backgroundColor: '#333' },
  bgDoc: { backgroundColor: '#007AFF' },
  bgPat: { backgroundColor: '#34C759' },
  editLink: { color: '#007AFF', fontSize: 14 },
  costTag: {
    color: '#007AFF',
    backgroundColor: '#EAF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logTotal: { color: '#666', fontSize: 13 },

  infoRow: { flexDirection: 'row', marginBottom: 4 },
  label: { color: '#888', fontSize: 12, marginBottom: 4 },
  value: { color: '#333', fontSize: 14, fontWeight: '600' },
  detailBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  detailLabel: { width: 64, color: '#888', fontSize: 13 },
  detailValue: { flex: 1, color: '#444', fontSize: 13 },
  logParamsBox: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  logParamsText: {
    flex: 1,
    color: '#444',
    fontSize: 13,
    lineHeight: 20,
  },
  statusValue: { fontSize: 13, fontWeight: 'bold' },
  statusEnabled: { color: '#34C759' },
  statusDisabled: { color: '#F44336' },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubTitle: { marginTop: 6, marginBottom: 18, color: '#666' },
  modalLabel: { fontSize: 14, color: '#555', marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    fontSize: 15,
    color: '#333',
  },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  roleOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  roleOptionActive: { borderColor: '#007AFF', backgroundColor: '#EAF4FF' },
  roleOptionText: { color: '#555', fontSize: 13 },
  roleOptionTextActive: { color: '#007AFF', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  cancelButton: { backgroundColor: '#f1f1f1' },
  disableButton: { backgroundColor: '#F44336' },
  saveButton: { backgroundColor: '#007AFF' },
  cancelButtonText: { color: '#555', fontWeight: 'bold' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
});
