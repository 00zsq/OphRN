# 待实现接口清单

> 本文档记录了所有需要从后端接口获取数据的 TODO 项，按照模块和优先级排列。

## 📋 目录

- [患者端 (Patient)](#患者端-patient)
  - [AI 问诊模块](#ai-问诊模块)
  - [预约模块](#预约模块)
  - [诊断模块](#诊断模块)
  - [个人资料模块](#个人资料模块)

---

## 患者端 (Patient)

### AI 问诊模块

**文件**: `src/views/patient/PatientAIChat.tsx`

| 优先级 | 接口/数据 | 说明 | 当前状态 |
|--------|-----------|------|----------|
| 🔴 高 | `AI_KNOWLEDGE_BASE` | AI 知识库数据（快捷提问列表） | ❌ 已删除，硬编码默认值 |
| 🔴 高 | `aiApi.chat()` | AI 对话接口 | ✅ 已调用，待验证 |

**TODO 事项**:
- [ ] 实现 AI 知识库接口，获取快捷提问列表
- [ ] 验证 `aiApi.chat()` 接口返回格式
- [ ] 替换硬编码的 fallbackAnswer 为动态数据

---

### 预约模块

**文件**: `src/views/patient/PatientAppointment.tsx`

| 优先级 | 接口/数据 | 说明 | 当前状态 |
|--------|-----------|------|----------|
| 🔴 高 | `USERS.doctor_list` | 医生列表数据 | ❌ 已删除，默认空数组 |
| 🟡 中 | `getCurrentUser()` | 获取当前用户信息 | ❌ 已删除，待实现 |
| 🟡 中 | `patientApi.doctorInfo()` | 医生信息接口 | ✅ 已调用 |
| 🟡 中 | `patientApi.appointments()` | 获取预约列表 | ✅ 已调用 |
| 🟡 中 | `patientApi.createAppointment()` | 创建预约 | ✅ 已调用 |
| 🟡 中 | `patientApi.updateAppointment()` | 更新/取消预约 | ✅ 已调用 |

**TODO 事项**:
- [ ] 实现医生列表接口
- [ ] 实现当前用户信息获取（本地存储或后端接口）
- [ ] 验证所有预约相关接口的返回格式

---

### 诊断模块

**文件**: `src/views/patient/PatientDiagnosis.tsx`

| 优先级 | 接口/数据 | 说明 | 当前状态 |
|--------|-----------|------|----------|
| 🔴 高 | `DIAGNOSIS_RESULTS_LIST` | 诊断结果列表（mock） | ❌ 已删除，使用默认空对象 |
| 🟡 中 | `FOLLOW_UP_PLAN` | 随访计划数据 | ❌ 已删除，需从接口获取 |
| 🟡 中 | `getCurrentUser()` | 获取当前用户信息 | ❌ 已删除，待实现 |
| 🟢 低 | `report.pdf` | 本地 PDF 报告资源 | ❌ 已删除注释 |

**TODO 事项**:
- [ ] 实现诊断结果接口（替换 DIAGNOSIS_RESULTS_LIST）
- [ ] 实现随访计划接口（替换 FOLLOW_UP_PLAN）
- [ ] 实现用户信息获取
- [ ] PDF 报告下载功能（从后端获取而非本地资源）

---

### 个人资料模块

**文件**: `src/views/patient/PatientProfile.tsx`

| 优先级 | 接口/数据 | 说明 | 当前状态 |
|--------|-----------|------|----------|
| 🔴 高 | `getCurrentUser()` | 获取当前用户信息 | ❌ 已删除，默认空对象 |
| 🟡 中 | 用户病史 (medicalHistory) | 个人病史数据 | ❌ 默认空数组 |
| 🟡 中 | 治疗记录 (treatments) | 近期治疗记录 | ❌ 默认空数组 |
| 🟡 中 | 医嘱 (doctorOrders) | 特别医嘱列表 | ❌ 默认空数组 |
| 🟡 中 | `patientApi.update()` | 更新用户信息 | ✅ 已调用 |
| 🟡 中 | `patientApi.bind()` | 绑定患者信息 | ✅ 已调用 |

**TODO 事项**:
- [ ] 实现用户基本信息接口
- [ ] 实现个人病史接口
- [ ] 实现治疗记录接口
- [ ] 实现医嘱接口
- [ ] 验证用户信息更新接口

---

## 📝 接口对接说明

### 当前已有的 API 调用

根据代码分析，以下 API 已经在代码中调用：

1. **AI 相关**:
   - `aiApi.chat(inputText)` - AI 对话

2. **患者相关**:
   - `patientApi.doctorInfo()` - 获取医生信息
   - `patientApi.appointments()` - 获取预约列表
   - `patientApi.createAppointment(data)` - 创建预约
   - `patientApi.updateAppointment(data)` - 更新预约
   - `patientApi.update(data)` - 更新用户信息
   - `patientApi.bind(data)` - 绑定患者信息

3. **诊断相关**:
   - `diagnosisApi.analyze(patient, leftImages, rightImages)` - AI 诊断分析
   - `reportApi.generate(id, lang)` - 生成报告
   - `reportApi.downloadUrl(id, format)` - 下载报告 URL

### 需要确认的接口

以下数据需要确认是否已有对应接口：

- [ ] AI 知识库列表接口
- [ ] 医生列表接口
- [ ] 诊断结果列表接口
- [ ] 随访计划接口
- [ ] 用户详细信息接口
- [ ] 个人病史接口
- [ ] 治疗记录接口
- [ ] 医嘱接口

---

## 🎯 下一步计划

1. **优先**: 确认上述接口是否已有后端实现
2. **高优先级**: 实现用户信息获取机制（本地存储或登录接口）
3. **中优先级**: 对接 AI 知识库和医生列表
4. **低优先级**: 对接诊断结果、随访计划等数据

---

*最后更新: 2026-05-27*
