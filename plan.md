# 接口对接完成清单

> 本文档记录当前已完成的真实接口对接状态。已解决的待办和临时占位记录已清理。

## 登录与用户状态

**文件**: `src/views/Home.tsx`, `src/store/user.ts`

| 模块 | 当前状态 |
|------|----------|
| 医生/管理员登录 | ✅ 已调用 `userApi.login()` |
| 患者登录 | ✅ 已调用 `patientApi.login()` |
| 本地用户状态 | ✅ 登录后通过 `setCurrentUser()` 持久化，页面通过 `getCurrentUser()` 读取 |
| 用户姓名兜底 | ✅ 已移除临时兜底，缺失时展示业务空态文案 |

---

## 患者端 (Patient)

### 患者首页

**文件**: `src/views/patient/Page3.tsx`

| 模块 | 当前状态 |
|------|----------|
| 首页欢迎语 | ✅ 使用当前登录用户姓名或用户名，缺失时展示“患者” |
| 快捷入口 | ✅ 保留拍照、诊断、预约、问诊等入口 |

### AI 问诊模块

**文件**: `src/views/patient/PatientAIChat.tsx`

| 模块 | 当前状态 |
|------|----------|
| AI 欢迎语 | ✅ 已改为正式欢迎文案 |
| AI 对话接口 | ✅ 已调用 `http://120.79.247.123:3000/api/chat` |
| 上下文会话 | ✅ 首次返回 `threadId` 后保存，后续请求继续携带 |
| 接口参数 | ✅ 默认发送 `enableWebSearch=false`、`allowBusinessToolCall=false` |

### 预约模块

**文件**: `src/views/patient/PatientAppointment.tsx`

| 模块 | 当前状态 |
|------|----------|
| 医生列表 | ✅ 已调用 `/dsod/patients/doctorinfo`，展示医生 ID、用户名、邮箱 |
| 创建预约 | ✅ 已调用 `/dsod/patients/appointment` 提交 `doctorId/appointmentTime` |
| 时间选择 | ✅ 已接入 `react-native-modal-datetime-picker`，避免手写时间格式 |
| 我的预约 | ✅ 已调用 `/dsod/patients/appointmentList` 展示预约状态和时间 |
| 修改/取消预约 | ✅ 已调用 `/dsod/patients/updateAppointment` |

### 诊断模块

**文件**: `src/views/patient/PatientDiagnosis.tsx`

| 模块 | 当前状态 |
|------|----------|
| 图片诊断 | ✅ 已同时调用 `diagnosisApi.analyze()` 和 `guestApi.analyze()` |
| 诊断结果 | ✅ 展示左右眼疾病、置信度和处理后图片 |
| 报告生成 | ✅ 已调用 `/dsod/reports/generate`，支持 `language=ZH/EN` |
| 报告下载 | ✅ 已调用 `/dsod/reports/download/{reportId}`，支持 `pdf/png/html` |
| 历史报告 | ✅ 已调用 `/dsod/patients/report`，未上传图片时也可查看历史报告 |
| 随访计划 | ✅ 已从 `reportContent` 中解析随访计划内容展示 |
| 日历跳转 | ✅ 保留系统日历跳转，用户打开日历后自行选择复查时间 |

### 个人资料模块

**文件**: `src/views/patient/PatientProfile.tsx`

| 模块 | 当前状态 |
|------|----------|
| 患者信息查询 | ✅ 登录后按用户名查询 `/dsod/manage/page/allpatientlist` |
| 密码修改 | ✅ 已拆分独立表单，调用 `patientApi.update()` |
| 个人信息绑定 | ✅ 已调用 `patientApi.bind()`，字段为 `name/idCard/age/sex` |
| 个人病史 | ✅ 已调用 `/dsod/manage/page/record?id=患者ID` 展示诊断记录 |
| 无接口字段模块 | ✅ 已删除特别医嘱、近期治疗记录、联系电话等临时模块 |

---

## 医生端 (Doctor)

**文件**: `src/views/doctor/Page2.tsx`, `src/views/doctor/DiagnosisItem.tsx`, `src/views/doctor/AppointmentItem.tsx`

| 模块 | 当前状态 |
|------|----------|
| AI 诊断审核 | ✅ 已基于患者列表和诊断记录接口展示审核卡片 |
| 更新病例 | ✅ 已接入上传左右眼图片并调用诊断接口更新记录 |
| 处理后图片 | ✅ 使用 `/dsod/guest/analyze` 返回的 `processedImgPaths` 渲染 |
| 预约列表 | ✅ 已调用 `/dsod/manage/appointment` 展示医生预约记录 |
| 确认预约 | ✅ 已调用 `/dsod/manage/appointmentConfirm/{id}` |

---

## 管理员端 (Admin)

**文件**: `src/views/admin/Page1.tsx`

| 模块 | 当前状态 |
|------|----------|
| 用户列表 | ✅ 已基于 `/dsod/manage/page/alluserlist` 适配 |
| 用户统计 | ✅ 总用户数使用接口 `total`，角色数量基于已加载记录统计 |
| 用户搜索 | ✅ 初始化不传 `username/role`，搜索时按 ID 或用户名查询 |
| 编辑用户 | ✅ 管理弹窗支持修改用户名、邮箱、角色和禁用用户 |
| 操作日志 | ✅ 已调用 `/dsod/manage/operateLog`，支持按用户 ID 或方法名搜索 |
| 分页加载 | ✅ 用户列表和日志列表支持触底加载更多 |

---

## API 调用索引

1. **登录/用户**
   - `userApi.login()` - 医生/管理员登录
   - `patientApi.login()` - 患者登录
   - `setCurrentUser(user, token)` - 本地保存当前用户
   - `getCurrentUser()` - 同步读取当前用户

2. **AI 对话**
   - `aiApi.chat({ question, threadId, enableWebSearch, allowBusinessToolCall })` - AI 上下文对话

3. **患者相关**
   - `patientApi.doctorInfo()` - 获取医生信息
   - `patientApi.appointments()` - 获取我的预约列表
   - `patientApi.createAppointment({ doctorId, appointmentTime })` - 创建预约
   - `patientApi.updateAppointment(data)` - 修改/取消预约
   - `patientApi.allPatients({ name, page, pageSize })` - 按姓名查询患者信息
   - `patientApi.recordsByPatient(id)` - 根据患者 ID 查询个人病史
   - `patientApi.reports()` - 查询患者历史诊断报告
   - `patientApi.update(data)` - 更新患者账号密码
   - `patientApi.bind(data)` - 绑定/修改患者基本信息

4. **医生/管理相关**
   - `manageApi.diagnosisHistory({ page, pageSize })` - 诊断历史/审核列表
   - `manageApi.appointments()` - 医生预约列表
   - `manageApi.confirmAppointment(id)` - 确认预约
   - `manageApi.allUsers({ username, role, page, pageSize })` - 系统用户列表
   - `manageApi.userById(id)` - 根据 ID 查询用户信息
   - `manageApi.allPatients({ page, pageSize })` - 患者列表
   - `userApi.updateByAdmin(data)` - 管理员修改用户信息

5. **诊断/报告**
   - `diagnosisApi.analyze(patient, leftImages, rightImages)` - 创建诊断记录并返回 `recordId`
   - `guestApi.analyze(leftImage, rightImage)` - 获取左右眼疾病、置信度和处理后图片
   - `reportApi.generate(recordId, language)` - 生成诊断报告，默认 `ZH`
   - `reportApi.downloadUrl(reportId, format)` - 拼接报告下载 URL，默认 `pdf`

*最后更新: 2026-05-28*
