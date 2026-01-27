export enum UserRole {
  Admin = "系统管理员",
  Chinese = "语文教研员",
  Math = "数学教研员",
  English = "英语教研员",
  Physics = "物理教研员",
  Chemistry = "化学教研员",
  Biology = "生物教研员",
  History = "历史教研员",
  Geography = "地理教研员",
  Politics = "道德与法治教研员",
  PE = "体育教研员",
  Art = "艺术教研员",
  IT = "信息技术教研员",
}

export enum UserStatus {
  Active = "在线",
  Offline = "离线",
  Inactive = "未激活",
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  department: string;
  status: UserStatus;
  avatarUrl: string;
  bio?: string;
  phone?: string;
  password?: string;
  joinDate?: string;
  expertise?: string[];
  lastLogin?: number;
  lastHeartbeat?: number;
}

export interface Project {
  id: string;
  name: string;
  deadline: string;
  progress: number;
  team: string[];
  extraTeamCount?: number;
  color: "primary" | "secondary";
}

export enum HonorLevel {
  National = "国家级",
  Provincial = "省级",
  Municipal = "市级",
  District = "区县级",
  School = "校级",
}

export enum CertificateCategory {
  Award = "荣誉表彰",
  Project = "课题结项",
  Training = "培训结业",
  Qualification = "职称资格",
  Other = "其他成果",
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  level: HonorLevel;
  category: CertificateCategory;
  credentialUrl?: string;
  hours?: number;
  timestamp: number;
  userId?: string;
}

export interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 string
  size: number;
  timestamp: number;
}

export type PromptCategory = "exam" | "certificate" | "critic";

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  timestamp: number;
  category: PromptCategory;
}

export interface ExamAnalysis {
  id: string;
  timestamp: number;
  subject: string;
  title: string;
  grade: string;
  difficulty: number;
  summary: string;
  knowledgePoints: string[];
  itemAnalysis: {
    question: string;
    point: string;
    insight: string;
  }[];
  teachingAdvice: string;
  imageUrl?: string;
}

export interface CriticMessage {
  id: string;
  role: "user" | "model";
  text: string;
  attachments?: { type: "image" | "pdf"; data: string; name: string }[];
  isError?: boolean;
}

export interface CriticSession {
  id: string;
  title: string;
  timestamp: number;
  messages: CriticMessage[];
}

// Dynamic Tag Interface
export interface EventTypeTag {
  id: string;
  name: string;
  colorClass: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: string;
  description?: string;
  participants?: string[]; // Names of participants
}

export type ViewState =
  | "schedule"
  | "users"
  | "user-profile"
  | "system-settings"
  | "certificates"
  | "certificate-detail"
  | "ai-exam-analysis"
  | "ai-critic"
  | "my-profile";

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
}
