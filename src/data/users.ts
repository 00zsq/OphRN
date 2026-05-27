import { clearAuthToken, setAuthToken } from '../api';

// 简单的会话状态管理
let currentUser: any = null;

export const setCurrentUser = (user: any, token?: string) => {
  currentUser = user;
  if (token) {
    setAuthToken(token);
  }
};
export const getCurrentUser = () => currentUser;
export const clearCurrentUser = () => {
  currentUser = null;
  clearAuthToken();
};

export const USERS = {
  admin: {
    username: 'admin',
    password: '123',
    name: '管理员',
  },
  doctor: {
    username: 'doctor',
    password: '123',
    name: '张主任',
    specialty: '青光眼专科',
  },
  // 医生列表：用于预约挂号
  doctor_list: [
    {
      id: 'd1',
      name: '李专家',
      specialty: '白内障专科',
      available: ['周一上午', '周三下午'],
    },
    {
      id: 'd2',
      name: '王医生',
      specialty: '眼底病专科',
      available: ['周二全天', '周五上午'],
    },
    {
      id: 'd3',
      name: '赵医师',
      specialty: '屈光不正',
      available: ['周四上午', '周六上午'],
    },
    {
      id: 'd4',
      name: '刘教授',
      specialty: '青光眼专家',
      available: ['周一上午', '周三上午'],
    },
  ],
  // 患者列表：支持多账号登录
  patients: [
    {
      username: 'patient',
      password: '123',
      name: '张三',
      phone: '13812345678',
      avatar:
        'https://deanservices.swpu.edu.cn/jwapp/sys/homeapp/public/images/user.png',
      // 合并后的详细个人信息 - 青光眼重点病例
      age: '45',
      gender: '男',
      idCard: '512***********1234',
      medicalHistory: [
        {
          id: 1,
          date: '2020-05',
          condition: '高度近视 (High Myopia)',
          status: '长期监测',
        },
        {
          id: 2,
          date: '2023-11',
          condition: '原发性开角型青光眼',
          status: '确诊治疗中',
        },
        {
          id: 3,
          date: '2024-01',
          condition: '干眼症',
          status: '间歇性发作',
        },
      ],
      treatments: [
        {
          id: 101,
          date: '2023-11-15',
          hospital: '市眼科中心',
          item: 'SLT 激光小梁成形术', // 针对青光眼的治疗
          doctor: '刘教授', // 对应 doctor_list 中的青光眼专家
          result: '眼压由 28mmHg 下降至 16mmHg，效果良好',
        },
        {
          id: 102,
          date: '2024-05-20',
          hospital: '市眼科中心',
          item: '24小时眼压监测 + 视野检查',
          doctor: '刘教授',
          result: '眼压控制稳定(15-18mmHg)，视野缺损无进展',
        },
      ],
      doctorOrders: [
        {
          type: 'med',
          content: '左眼每日早晚各一次，使用噻摩洛尔滴眼液（降眼压）。',
          tag: '用药',
        },
        {
          type: 'med',
          content: '双眼每日4次，玻璃酸钠滴眼液（缓解干眼）。',
          tag: '用药',
        },
        {
          type: 'check',
          content: '建议每 3 个月复查一次眼压，每半年复查视野。',
          tag: '复查',
        },
      ],
    },
    {
      username: 'patient2',
      password: '123',
      name: '小美',
      phone: '13987654321',
      avatar:
        'https://deanservices.swpu.edu.cn/jwapp/sys/homeapp/public/images/user.png',
      // 合并后的详细个人信息 - 白内障重点病例
      age: '68',
      gender: '女',
      idCard: '511***********8888',
      medicalHistory: [
        {
          id: 1,
          date: '2022-03',
          condition: '年龄相关性白内障',
          status: '观察期',
        },
        { id: 2, date: '2023-09', condition: '过敏性结膜炎', status: '已治愈' },
      ],
      treatments: [
        {
          id: 201,
          date: '2022-03-10',
          hospital: '第一人民医院',
          item: '裂隙灯检查',
          doctor: '李专家', // 对应 doctor_list 中的白内障专家
          result: '晶状体皮质轻度混浊',
        },
        {
          id: 202,
          date: '2024-02-15',
          hospital: '第一人民医院',
          item: '晶状体混浊度检测',
          doctor: '李专家',
          result: '混浊度略有增加，矫正视力 0.6，暂不需要手术',
        },
      ],
      doctorOrders: [
        {
          type: 'med',
          content: '每日3次，滴用吡诺克辛钠滴眼液（延缓白内障）。',
          tag: '用药',
        },
        {
          type: 'life',
          content: '户外强烈阳光下请务必佩戴墨镜，减少紫外线伤害。',
          tag: '生活',
        },
        {
          type: 'check',
          content: '每半年定期复查视力及晶状体状况，视力低于0.4考虑手术。',
          tag: '复查',
        },
      ],
    },
  ],
};
