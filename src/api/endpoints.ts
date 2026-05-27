import {
  appendFile,
  buildApiUrl,
  getAuthHeaders,
  request,
  type QueryParams,
} from './client';
import type {
  ApiResult,
  AppUser,
  Appointment,
  DiagnosisPatientPayload,
  DiagnosisReport,
  DiseaseConfidence,
  FeedbackDTO,
  LoginVO,
  PageResult,
  Patient,
  PatientUser,
  UploadFile,
} from './types';

export const userApi = {
  login: (body: Pick<AppUser, 'username' | 'password'>) =>
    request<ApiResult<LoginVO>>('/dsod/users/login', {
      method: 'POST',
      body,
      skipAuth: true,
    }),
  logout: () =>
    request<ApiResult<string>>('/dsod/users/logout', { method: 'POST' }),
  register: (body: Pick<AppUser, 'username' | 'password' | 'role' | 'email'>) =>
    request<ApiResult<string>>('/dsod/users/register', {
      method: 'POST',
      body,
      skipAuth: true,
    }),
  updateSelf: (body: Pick<AppUser, 'username' | 'password' | 'email'>) =>
    request<ApiResult<string>>('/dsod/users/update/self', {
      method: 'POST',
      body,
    }),
  updateByAdmin: (body: AppUser) =>
    request<ApiResult<string>>('/dsod/users/update/admin', {
      method: 'POST',
      body,
    }),
  feedback: (body: FeedbackDTO) =>
    request<ApiResult<string>>('/dsod/users/feedback', {
      method: 'POST',
      body,
    }),
};

export const guestApi = {
  analyze: (leftImage: string | UploadFile, rightImage: string | UploadFile) => {
    const formData = new FormData();
    appendFile(formData, 'leftImage', leftImage, 'left.jpg');
    appendFile(formData, 'rightImage', rightImage, 'right.jpg');

    return request<ApiResult<Record<string, unknown>>>('/dsod/guest/analyze', {
      method: 'POST',
      formData,
    });
  },
};

export const manageApi = {
  allUsers: (
    query: QueryParams & { page: number; pageSize: number } = {
      page: 1,
      pageSize: 10,
    },
  ) =>
    request<ApiResult<PageResult<AppUser>>>('/dsod/manage/page/alluserlist', {
      query,
    }),
  allPatients: (
    query: QueryParams & { page: number; pageSize: number } = {
      page: 1,
      pageSize: 10,
    },
  ) =>
    request<ApiResult<PageResult<Patient>>>('/dsod/manage/page/allpatientlist', {
      query,
    }),
  recordsByPatient: (id?: number) =>
    request<ApiResult<unknown>>('/dsod/manage/page/record', {
      query: { id },
    }),
  userById: (id?: number) =>
    request<ApiResult<AppUser>>('/dsod/manage/select/id', {
      query: { id },
    }),
  diagnosisHistory: (
    query: QueryParams & { page: number; pageSize: number } = {
      page: 1,
      pageSize: 10,
    },
  ) =>
    request<ApiResult<PageResult<Record<string, unknown>>>>(
      '/dsod/manage/page/history',
      { query },
    ),
  patientByRecordId: (id: number) =>
    request<ApiResult<Patient>>('/dsod/manage/selectbyrecordid', {
      query: { id },
    }),
  confidenceByRecordId: (id: number) =>
    request<ApiResult<DiseaseConfidence>>('/dsod/manage/selectconfidence', {
      query: { id },
    }),
  roles: () => request<ApiResult<string[]>>('/dsod/manage/role'),
  operateLog: (
    query: QueryParams & { page: number; pageSize: number } = {
      page: 1,
      pageSize: 10,
    },
  ) =>
    request<ApiResult<PageResult<Record<string, unknown>>>>(
      '/dsod/manage/operateLog',
      { query },
    ),
  feedback: (
    query: QueryParams & { page: number; pageSize: number } = {
      page: 1,
      pageSize: 10,
    },
  ) =>
    request<ApiResult<PageResult<FeedbackDTO>>>('/dsod/manage/feedback', {
      query,
    }),
  appointments: () =>
    request<ApiResult<Appointment[]>>('/dsod/manage/appointment'),
  confirmAppointment: (id?: number) =>
    request<ApiResult<unknown>>('/dsod/manage/confirmappointment', {
      query: { id },
    }),
};

export const reportApi = {
  generate: (recordId: number, language = 'ZH') =>
    request<ApiResult<DiagnosisReport>>('/dsod/reports/generate', {
      method: 'POST',
      query: { recordId, language },
    }),
  downloadUrl: (reportId: number, format = 'pdf') =>
    buildApiUrl('/dsod/reports/download/{reportId}', { format }, { reportId }),
  downloadHeaders: () => getAuthHeaders(),
};

export const diagnosisApi = {
  analyze: (
    patients: DiagnosisPatientPayload[],
    leftImages: Array<string | UploadFile>,
    rightImages: Array<string | UploadFile>,
  ) => {
    const formData = new FormData();
    formData.append('patients', JSON.stringify(patients));
    leftImages.forEach((image, index) =>
      appendFile(formData, 'leftImage', image, `left_${index + 1}.jpg`),
    );
    rightImages.forEach((image, index) =>
      appendFile(formData, 'rightImage', image, `right_${index + 1}.jpg`),
    );

    return request<ApiResult<Array<Record<string, number>>>>(
      '/dsod/diagnosis/analyze',
      {
        method: 'POST',
        formData,
      },
    );
  },
};

export const statisticsApi = {
  patientAndDisease: () =>
    request<ApiResult<Record<string, unknown>>>(
      '/dsod/statistics/patientAndDisease',
    ),
  userAndRole: () =>
    request<ApiResult<Record<string, unknown>>>('/dsod/statistics/userAndRole'),
  diagnosisRecord: () =>
    request<ApiResult<Record<string, unknown>>>(
      '/dsod/statistics/diagnosisRecord',
    ),
  operateLog: () =>
    request<ApiResult<Record<string, unknown>>>(
      '/dsod/statistics/operateLog',
    ),
};

export const aiApi = {
  chat: (question: string) =>
    request<unknown>('/ai/chat', {
      method: 'POST',
      body: { question },
    }),
};

export const patientApi = {
  login: (body: Pick<PatientUser, 'username' | 'password'>) =>
    request<ApiResult<LoginVO | PatientUser | Record<string, unknown>>>(
      '/dsod/patients/login',
      {
        method: 'POST',
        body,
        skipAuth: true,
      },
    ),
  register: (body: Pick<PatientUser, 'username' | 'password'>) =>
    request<ApiResult<unknown>>('/dsod/patients/register', {
      method: 'POST',
      body,
      skipAuth: true,
    }),
  logout: () => request<ApiResult<unknown>>('/dsod/patients/logout'),
  doctorInfo: () => request<ApiResult<unknown[]>>('/dsod/patients/doctorinfo'),
  update: (body: PatientUser) =>
    request<ApiResult<unknown>>('/dsod/patients/update', {
      method: 'POST',
      body,
    }),
  bind: (body: Patient) =>
    request<ApiResult<unknown>>('/dsod/patients/bind', {
      method: 'POST',
      body,
    }),
  createAppointment: (body: Appointment) =>
    request<ApiResult<unknown>>('/dsod/patients/appointment', {
      method: 'POST',
      body,
    }),
  appointments: () =>
    request<ApiResult<Appointment[]>>('/dsod/patients/appointmentList'),
  updateAppointment: (body: Appointment) =>
    request<ApiResult<unknown>>('/dsod/patients/updateAppointment', {
      method: 'POST',
      body,
    }),
  reports: () =>
    request<ApiResult<DiagnosisReport[]>>('/dsod/patients/report'),
  downloadUrl: (reportId: number, format = 'pdf') =>
    buildApiUrl('/dsod/patients/download/{reportId}', { format }, { reportId }),
  downloadHeaders: () => getAuthHeaders(),
};

export const dataApi = {
  monitor: () => request<unknown>('/dsod/data/monitor'),
  unconfirmedCount: () => request<unknown>('/dsod/data/unconfirmed-count'),
};
