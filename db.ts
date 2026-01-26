import {
  User,
  Certificate,
  ExamAnalysis,
  CriticSession,
  PromptTemplate,
  ScheduleEvent,
  EventTypeTag,
  StoredFile,
  UserRole,
  CustomProvider,
} from "./types";

const API_BASE = "/api";
const AUTH_STORAGE_KEY = "helerix_auth_user_id";

const getAuthHeaders = () => {
  const userId =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_STORAGE_KEY)
      : null;
  return {
    "Content-Type": "application/json",
    "x-user-id": userId || "",
  };
};

// ============ USERS ============
export const UserDatabase = {
  initialize: async (): Promise<void> => {
    // No initialization needed for API-based database
  },

  getAll: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  getById: async (id: string): Promise<User | null> => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  add: async (user: User): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add user");
    }
    return UserDatabase.getAll();
  },

  update: async (user: User): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users/${user.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error("Failed to update user");
    return UserDatabase.getAll();
  },

  delete: async (id: string): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete user");
    return UserDatabase.getAll();
  },

  batchResetPassword: async (
    ids: string[],
    password: string,
  ): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, password }),
    });
    if (!res.ok) throw new Error("Failed to batch reset passwords");
    return UserDatabase.getAll();
  },

  updateLastLogin: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/users/${id}/last-login`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to update last login");
  },
};

// ============ CERTIFICATES ============
export const CertificateDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (): Promise<Certificate[]> => {
    const res = await fetch(`${API_BASE}/certificates`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch certificates");
    return res.json();
  },

  getById: async (id: string): Promise<Certificate | null> => {
    const res = await fetch(`${API_BASE}/certificates/${id}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch certificate");
    return res.json();
  },

  add: async (cert: Certificate): Promise<Certificate[]> => {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem(AUTH_STORAGE_KEY)
        : null;
    const certWithUser = { ...cert, userId };
    const res = await fetch(`${API_BASE}/certificates`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(certWithUser),
    });
    if (!res.ok) throw new Error("Failed to add certificate");
    return CertificateDatabase.getAll();
  },

  update: async (cert: Certificate): Promise<Certificate[]> => {
    const res = await fetch(`${API_BASE}/certificates/${cert.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(cert),
    });
    if (!res.ok) throw new Error("Failed to update certificate");
    return CertificateDatabase.getAll();
  },

  delete: async (id: string): Promise<Certificate[]> => {
    const res = await fetch(`${API_BASE}/certificates/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete certificate");
    return CertificateDatabase.getAll();
  },
};

// ============ EXAM ANALYSES ============
export const ExamAnalysisDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (): Promise<ExamAnalysis[]> => {
    const res = await fetch(`${API_BASE}/exam-analyses`);
    if (!res.ok) throw new Error("Failed to fetch exam analyses");
    return res.json();
  },

  add: async (analysis: ExamAnalysis): Promise<ExamAnalysis[]> => {
    const res = await fetch(`${API_BASE}/exam-analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    });
    if (!res.ok) throw new Error("Failed to add exam analysis");
    return ExamAnalysisDatabase.getAll();
  },

  delete: async (id: string): Promise<ExamAnalysis[]> => {
    const res = await fetch(`${API_BASE}/exam-analyses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete exam analysis");
    return ExamAnalysisDatabase.getAll();
  },
};

// ============ CRITIC SESSIONS ============
export const CriticDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (): Promise<CriticSession[]> => {
    const res = await fetch(`${API_BASE}/critic-sessions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch critic sessions");
    return res.json();
  },

  addOrUpdate: async (session: CriticSession): Promise<CriticSession[]> => {
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem(AUTH_STORAGE_KEY)
        : null;
    const sessionWithUser = { ...session, userId };
    const res = await fetch(`${API_BASE}/critic-sessions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(sessionWithUser),
    });
    if (!res.ok) throw new Error("Failed to save critic session");
    return CriticDatabase.getAll();
  },

  delete: async (id: string): Promise<CriticSession[]> => {
    const res = await fetch(`${API_BASE}/critic-sessions/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete critic session");
    return CriticDatabase.getAll();
  },
};

// ============ PROMPTS ============
export const PromptDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (category?: string): Promise<PromptTemplate[]> => {
    const url = category
      ? `${API_BASE}/prompts?category=${category}`
      : `${API_BASE}/prompts`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch prompts");
    return res.json();
  },

  add: async (prompt: PromptTemplate): Promise<PromptTemplate[]> => {
    const res = await fetch(`${API_BASE}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt),
    });
    if (!res.ok) throw new Error("Failed to add prompt");
    return PromptDatabase.getAll(prompt.category);
  },

  delete: async (id: string, category: string): Promise<PromptTemplate[]> => {
    const res = await fetch(`${API_BASE}/prompts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete prompt");
    return PromptDatabase.getAll(category);
  },
};

// ============ EVENTS ============
export const EventsDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (): Promise<ScheduleEvent[]> => {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },

  add: async (event: ScheduleEvent): Promise<ScheduleEvent[]> => {
    const res = await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error("Failed to add event");
    return EventsDatabase.getAll();
  },

  delete: async (id: string): Promise<ScheduleEvent[]> => {
    const res = await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete event");
    return EventsDatabase.getAll();
  },
};

// ============ EVENT TYPES ============
export const EventTypeDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (): Promise<EventTypeTag[]> => {
    const res = await fetch(`${API_BASE}/event-types`);
    if (!res.ok) throw new Error("Failed to fetch event types");
    return res.json();
  },

  add: async (name: string, colorClass: string): Promise<EventTypeTag[]> => {
    const res = await fetch(`${API_BASE}/event-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, colorClass }),
    });
    if (!res.ok) throw new Error("Failed to add event type");
    return EventTypeDatabase.getAll();
  },

  delete: async (id: string): Promise<EventTypeTag[]> => {
    const res = await fetch(`${API_BASE}/event-types/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete event type");
    return EventTypeDatabase.getAll();
  },
};

// ============ AI PROVIDERS ============
export const AIProviderDatabase = {
  initialize: async (): Promise<void> => {},

  getAll: async (): Promise<CustomProvider[]> => {
    const res = await fetch(`${API_BASE}/ai-providers`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch AI providers");
    return res.json();
  },

  add: async (provider: CustomProvider): Promise<CustomProvider[]> => {
    const res = await fetch(`${API_BASE}/ai-providers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(provider),
    });
    if (!res.ok) throw new Error("Failed to add AI provider");
    return AIProviderDatabase.getAll();
  },

  update: async (provider: CustomProvider): Promise<CustomProvider[]> => {
    const res = await fetch(`${API_BASE}/ai-providers/${provider.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(provider),
    });
    if (!res.ok) throw new Error("Failed to update AI provider");
    return AIProviderDatabase.getAll();
  },

  delete: async (id: string): Promise<CustomProvider[]> => {
    const res = await fetch(`${API_BASE}/ai-providers/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete AI provider");
    return AIProviderDatabase.getAll();
  },
};

// ============ AGENT USAGE ============
export const AgentUsageDatabase = {
  getStats: async (): Promise<
    Record<string, { count: number; lastUsed?: number }>
  > => {
    const res = await fetch(`${API_BASE}/agent-usage`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch agent usage");
    return res.json();
  },

  recordUsage: async (agentId: string): Promise<void> => {
    await fetch(`${API_BASE}/agent-usage`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ agentId }),
    });
  },
};

// ============ FILE MANAGER ============
export const FileManager = {
  initialize: async (): Promise<void> => {},

  saveFile: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          const res = await fetch(`${API_BASE}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              mimeType: file.type,
              data: base64,
              size: file.size,
            }),
          });
          if (!res.ok) throw new Error("Failed to upload file");
          const data = await res.json();
          resolve(data.uri);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  getFile: async (uri: string): Promise<StoredFile | null> => {
    if (!uri.startsWith("file://")) return null;
    const id = uri.replace("file://", "");
    const res = await fetch(`${API_BASE}/files/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch file");
    return res.json();
  },

  resolveToDataUrl: async (uri: string): Promise<string | null> => {
    const file = await FileManager.getFile(uri);
    if (!file) return null;
    return `data:${file.mimeType};base64,${file.data}`;
  },

  deleteFile: async (uri: string): Promise<void> => {
    if (!uri.startsWith("file://")) return;
    const id = uri.replace("file://", "");
    await fetch(`${API_BASE}/files/${id}`, { method: "DELETE" });
  },
};

// ============ DATABASE MANAGER ============
export const DatabaseManager = {
  exportDatabase: async (): Promise<Uint8Array | null> => {
    const res = await fetch(`${API_BASE}/database/export`);
    if (!res.ok) throw new Error("Failed to export database");
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  },

  importDatabase: async (data: Uint8Array): Promise<boolean> => {
    // Note: Import functionality would require server-side implementation
    // For now, we just return false as it's not supported
    console.warn("Database import is not supported in API mode");
    return false;
  },
};
