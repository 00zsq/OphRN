export type UserRole =
  | 'DOCTOR'
  | 'HEALTHCARE'
  | 'INSTITUTION'
  | 'RESEARCHER'
  | 'ADMIN';

export interface ApiResult<T = unknown> {
  code: number;
  msg?: string;
  data: T;
}

export interface PageResult<T = unknown> {
  total: number;
  records: T[];
}

export interface LoginVO {
  userId: number;
  username: string;
  token: string;
  email?: string;
  role?: UserRole;
}

export interface AppUser {
  id?: number;
  username?: string;
  password?: string;
  role?: UserRole;
  email?: string;
  status?: number;
  createTime?: string;
}

export interface Patient {
  id?: number;
  name?: string;
  idCard?: string;
  age?: number;
  sex?: string;
}

export interface PatientUser {
  id?: number;
  username?: string;
  password?: string;
  patientId?: number;
  createTime?: string;
}

export interface Appointment {
  id?: number;
  patientId?: number;
  doctorId?: number;
  appointmentTime?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  confirmTime?: string;
  cancelTime?: string;
  createTime?: string;
}

export interface DiagnosisReport {
  id?: number;
  recordId?: number;
  reportContent?: string;
  format?: string;
  language?: string;
  createTime?: string;
}

export interface DiseaseConfidence {
  recordId?: number;
  diseaseId?: number;
  confidence?: number;
}

export interface FeedbackDTO {
  userId?: number;
  content: string;
}

export interface DiagnosisPatientPayload {
  id?: number;
  name?: string;
  idCard?: string;
  age?: number;
  sex?: string;
}

export interface UploadFile {
  uri: string;
  name?: string;
  type?: string;
}
