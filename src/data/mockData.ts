export const DIAGNOSIS_RESULTS_LIST = [
  {
    summary:
      '双眼视盘色泽淡红，边界清晰，杯盘比（C/D）约 0.3，属正常范围。黄斑中心凹反光可见，视网膜血管走行正常，未见出血或渗出。',
    riskLevel: '正常',
    disease: '未见明显异常',
    suggestion:
      '您的眼部状况良好，建议保持良好的用眼习惯，每年进行一次常规检查。',
  },
  {
    summary:
      '双眼视盘边界清晰，杯盘比（C/D）约 0.6，并在临界范围。左眼黄斑区未见明显异常。右眼视网膜血管走行大致正常。',
    riskLevel: '高风险',
    disease: '疑似早期青光眼',
    suggestion: '建议进一步进行视野检查及OCT扫描。',
  },
  {
    summary: '眼底可见散在微血管瘤及少量硬性渗出，视网膜静脉轻度扩张。',
    riskLevel: '中风险',
    disease: '疑似糖尿病视网膜病变',
    suggestion: '建议严格控制血糖，并前往眼科进行眼底荧光造影检查。',
  },
  {
    summary: '晶状体混浊导致眼底成像略显模糊，视盘颜色稍淡。',
    riskLevel: '低风险',
    disease: '疑似早期白内障',
    suggestion: '建议户外活动佩戴墨镜，避免紫外线直射，定期监测视力。',
  },
];

export const FOLLOW_UP_PLAN = {
  title: '眼部健康复查提醒',
  frequency: '每3-6个月一次',
  nextDate: '2025-06-15', // 这里的日期会被代码中的动态计算覆盖
  details: '请前往医院进行眼压测量与眼底照相复查。',
};

export const AI_KNOWLEDGE_BASE = [
  {
    question: '青光眼如何治疗',
    answer:
      '青光眼的治疗目标是降低眼压，保护视神经。主要治疗方法包括：\n1. 药物治疗：如前列腺素衍生物滴眼液。\n2. 激光治疗：如激光小梁成形术。\n3. 手术治疗：如小梁切除术。\n具体方案需遵循医嘱。',
  },
  {
    question: '眼部日常护理',
    answer:
      '1. 避免长时间用眼，每40分钟休息10分钟。\n2. 保持光线充足。\n3. 多吃富含维生素A、C、E的食物。\n4. 定期进行眼科检查。',
  },
  {
    question: '白内障早期症状',
    answer:
      '白内障早期症状包括：视力模糊、对光敏感、夜间视力变差、看颜色发黄或褪色、单眼复视等。若发现上述症状，建议及时就医。',
  },
];

/**
 * 根据角色和姓名生成特定的模拟日志
 */
export const getMockLogs = (role: string, name: string): string[] => {
  const getDate = (offset: number, time: string) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const dateStr = d.toISOString().split('T')[0];
    return `${dateStr} ${time}`;
  };

  if (role === '管理员') {
    return [
      `${getDate(0, '09:00:15')} 登录管理后台`,
      `${getDate(0, '09:15:20')} 浏览了用户列表`,
      `${getDate(0, '10:30:05')} 修改了系统公告设置`,
      `${getDate(1, '18:00:00')} 执行数据库自动备份`,
      `${getDate(2, '14:20:11')} 冻结了违规账号 [temp_user_99]`,
    ];
  }

  if (role === '医生') {
    const logs = [
      `${getDate(0, '08:25:30')} 登录医生工作站`,
      `${getDate(0, '08:40:00')} 查看今日预约挂号列表`,
    ];
    if (name.includes('主任') || name.includes('教授')) {
      logs.push(`${getDate(0, '09:10:00')} 审核下级医生病历草案`);
      logs.push(`${getDate(0, '11:00:00')} 参与疑难杂症会诊会议`);
    } else {
      logs.push(`${getDate(0, '09:05:00')} 接诊患者 [001号]`);
      logs.push(`${getDate(0, '09:30:00')} 开具检查单: 眼底照相`);
    }
    logs.push(`${getDate(1, '17:30:00')} 完成当日工作日志填报`);
    return logs;
  }

  if (role === '患者') {
    const logs = [`${getDate(0, '19:20:44')} 登录 OphRN App`];
    if (name === '张三') {
      logs.push(`${getDate(0, '19:22:10')} 查看了 [青光眼] 相关的健康建议`);
      logs.push(`${getDate(0, '19:25:30')} 记录了今日眼压数据 (18mmHg)`);
      logs.push(`${getDate(2, '09:00:00')} 预约了 [刘教授] 的专家号`);
    } else if (name === '小美') {
      logs.push(`${getDate(0, '20:10:05')} 上传了最新的验光单`);
      logs.push(`${getDate(1, '10:15:00')} 咨询客服: "白内障手术医保报销比例"`);
      logs.push(`${getDate(3, '08:30:00')} 取消了原定于周五的复查预约`);
    } else {
      logs.push(`${getDate(0, '20:00:00')} 浏览了医院简介页面`);
    }
    logs.push(`${getDate(5, '10:00:00')} 更新了登录密码`);
    return logs;
  }

  return [`${getDate(0, '00:00:00')} 无操作记录`];
};
