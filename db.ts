
import { User, Project, Certificate, HonorLevel, CertificateCategory, ExamAnalysis, PromptTemplate, ScheduleEvent, StoredFile, EventTypeTag, UserRole, UserStatus, CriticSession } from "./types";
import { MOCK_USERS, MOCK_PROJECTS, AVATAR_ALEX } from "./constants";

declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

const DB_STORAGE_KEY = "helerix_sqlite_db_v9"; // Increment version for critic sessions
let dbInstance: any = null;
let SQL: any = null;
let initPromise: Promise<void> | null = null;

const toBase64 = (u8: Uint8Array): string => {
  let binary = "";
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return window.btoa(binary);
};

const fromBase64 = (str: string): Uint8Array => {
  const binary_string = window.atob(str);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

const saveDatabase = () => {
  if (dbInstance) {
    const data = dbInstance.export();
    const base64 = toBase64(data);
    localStorage.setItem(DB_STORAGE_KEY, base64);
  }
};

const initializeDB = async () => {
  if (dbInstance) return;

  if (!window.initSqlJs) {
    console.error("sql.js not loaded");
    return;
  }

  SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  const storedDb = localStorage.getItem(DB_STORAGE_KEY);
  
  if (storedDb) {
    try {
      const data = fromBase64(storedDb);
      dbInstance = new SQL.Database(data);
    } catch (e) {
      console.error("Failed to load DB, creating new", e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      roles TEXT, 
      department TEXT,
      status TEXT,
      avatarUrl TEXT,
      bio TEXT,
      phone TEXT,
      joinDate TEXT,
      expertise TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      deadline TEXT,
      progress INTEGER,
      team TEXT, 
      extraTeamCount INTEGER,
      color TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      name TEXT,
      issuer TEXT,
      issueDate TEXT,
      level TEXT,
      category TEXT,
      credentialUrl TEXT,
      hours INTEGER,
      timestamp INTEGER
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      name TEXT,
      mimeType TEXT,
      data TEXT,
      size INTEGER,
      timestamp INTEGER
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS exam_analyses (
      id TEXT PRIMARY KEY,
      timestamp INTEGER,
      subject TEXT,
      title TEXT,
      grade TEXT,
      difficulty INTEGER,
      summary TEXT,
      knowledgePoints TEXT,
      itemAnalysis TEXT,
      teachingAdvice TEXT,
      imageUrl TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS critic_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      timestamp INTEGER,
      messages TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT,
      content TEXT,
      isDefault INTEGER,
      timestamp INTEGER,
      category TEXT
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT,
      date TEXT,
      startTime TEXT,
      endTime TEXT,
      type TEXT,
      description TEXT,
      participants TEXT 
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS event_types (
      id TEXT PRIMARY KEY,
      name TEXT,
      colorClass TEXT
    );
  `);

  // Initialize data if tables are empty
  const certCount = dbInstance.exec("SELECT count(*) as count FROM certificates")[0].values[0][0];
  if (certCount === 0) {
    const todayYear = new Date().getFullYear();
    const stmt = dbInstance.prepare("INSERT INTO certificates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const mockCerts: Certificate[] = [
      { id: "c1", name: "2023年度优秀教研员", issuer: "省教育厅", issueDate: "2023-01-15", level: HonorLevel.Provincial, category: CertificateCategory.Award, credentialUrl: "", hours: 0, timestamp: Date.now() - 86400000 * 30 },
      { id: "c2", name: "中学数学新课标培训结业证", issuer: "国家教育行政学院", issueDate: `${todayYear}-05-10`, level: HonorLevel.National, category: CertificateCategory.Training, credentialUrl: "", hours: 40, timestamp: Date.now() - 86400000 * 5 },
      { id: "c3", name: "高级教师职称资格证", issuer: "市人力资源和社会保障局", issueDate: "2021-08-20", level: HonorLevel.Municipal, category: CertificateCategory.Qualification, credentialUrl: "", hours: 0, timestamp: Date.now() - 86400000 * 60 },
      { id: "c4", name: "AI辅助教学深度研修班", issuer: "数字化教研中心", issueDate: `${todayYear}-10-20`, level: HonorLevel.School, category: CertificateCategory.Training, credentialUrl: "", hours: 24, timestamp: Date.now() - 3600000 }
    ];
    mockCerts.forEach(c => {
      stmt.run([c.id, c.name, c.issuer, c.issueDate, c.level, c.category, c.credentialUrl || "", c.hours || 0, c.timestamp]);
    });
    stmt.free();
  }

  const userCount = dbInstance.exec("SELECT count(*) as count FROM users")[0].values[0][0];
  if (userCount === 0) {
    const adminUser: User = {
        id: "1",
        name: "陈老师",
        email: "chen.teacher@helerix.edu",
        roles: [UserRole.Admin, UserRole.Math],
        department: "数字化教研中心",
        status: UserStatus.Active,
        avatarUrl: AVATAR_ALEX,
        bio: "",
        phone: "+86 188 8888 8888",
        joinDate: "2022年03月15日",
        expertise: []
    };
    dbInstance.run("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [adminUser.id, adminUser.name, adminUser.email, JSON.stringify(adminUser.roles), adminUser.department, adminUser.status, adminUser.avatarUrl, adminUser.bio, adminUser.phone, adminUser.joinDate, JSON.stringify(adminUser.expertise)]);
  }

  saveDatabase();
};

const ensureInitialized = async () => {
  if (!initPromise) {
    initPromise = initializeDB();
  }
  await initPromise;
};

export const CriticDatabase = {
  initialize: ensureInitialized,
  getAll: async (): Promise<CriticSession[]> => {
    await ensureInitialized();
    const result = dbInstance.exec("SELECT * FROM critic_sessions ORDER BY timestamp DESC");
    if (result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map((row: any[]) => {
      const s: any = {};
      columns.forEach((col: string, index: number) => {
        if (col === 'messages') {
          try { s[col] = JSON.parse(row[index]); } catch { s[col] = []; }
        } else {
          s[col] = row[index];
        }
      });
      return s as CriticSession;
    });
  },
  addOrUpdate: async (session: CriticSession): Promise<CriticSession[]> => {
    await ensureInitialized();
    dbInstance.run(
      "INSERT OR REPLACE INTO critic_sessions (id, title, timestamp, messages) VALUES (?, ?, ?, ?)",
      [session.id, session.title, session.timestamp, JSON.stringify(session.messages)]
    );
    saveDatabase();
    return CriticDatabase.getAll();
  },
  delete: async (id: string): Promise<CriticSession[]> => {
    await ensureInitialized();
    dbInstance.run("DELETE FROM critic_sessions WHERE id = ?", [id]);
    saveDatabase();
    return CriticDatabase.getAll();
  }
};

export const UserDatabase = {
  initialize: ensureInitialized,
  getAll: async (): Promise<User[]> => {
    await ensureInitialized();
    const result = dbInstance.exec("SELECT * FROM users");
    if (result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map((row: any[]) => {
      const user: any = {};
      columns.forEach((col: string, index: number) => {
        if (['roles', 'expertise'].includes(col)) {
          try { user[col] = JSON.parse(row[index]); } catch { user[col] = []; }
        } else { user[col] = row[index]; }
      });
      return user as User;
    });
  },
  getById: async (id: string): Promise<User | null> => {
    await ensureInitialized();
    const stmt = dbInstance.prepare("SELECT * FROM users WHERE id = :id");
    const result = stmt.getAsObject({':id': id});
    stmt.free();
    if (!result || !result.id) return null;
    try { result.roles = JSON.parse(result.roles as string); } catch { result.roles = []; }
    try { result.expertise = JSON.parse(result.expertise as string); } catch { result.expertise = []; }
    return result as unknown as User;
  },
  add: async (user: User): Promise<User[]> => {
    await ensureInitialized();
    dbInstance.run("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      user.id, 
      user.name, 
      user.email, 
      JSON.stringify(user.roles), 
      user.department, 
      user.status, 
      user.avatarUrl, 
      user.bio || "", 
      user.phone || "", 
      user.joinDate || "", 
      JSON.stringify(user.expertise || [])
    ]);
    saveDatabase();
    return UserDatabase.getAll();
  },
  update: async (user: User): Promise<User[]> => {
    await ensureInitialized();
    dbInstance.run(`UPDATE users SET name = ?, email = ?, roles = ?, department = ?, status = ?, avatarUrl = ?, bio = ?, phone = ?, joinDate = ?, expertise = ? WHERE id = ?`, [user.name, user.email, JSON.stringify(user.roles), user.department, user.status, user.avatarUrl, user.bio || "", user.phone || "", user.joinDate || "", JSON.stringify(user.expertise || []), user.id]);
    saveDatabase();
    return UserDatabase.getAll();
  },
  delete: async (id: string): Promise<User[]> => {
    await ensureInitialized();
    dbInstance.run("DELETE FROM users WHERE id = ?", [id]);
    saveDatabase();
    return UserDatabase.getAll();
  }
};

export const CertificateDatabase = {
  initialize: ensureInitialized,
  getAll: async (): Promise<Certificate[]> => {
    await ensureInitialized();
    const result = dbInstance.exec("SELECT * FROM certificates");
    if (result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map((row: any[]) => {
      const c: any = {};
      columns.forEach((col: string, index: number) => c[col] = row[index]);
      return c as Certificate;
    });
  },
  getById: async (id: string): Promise<Certificate | null> => {
    await ensureInitialized();
    const stmt = dbInstance.prepare("SELECT * FROM certificates WHERE id = :id");
    const result = stmt.getAsObject({':id': id});
    stmt.free();
    if (!result || !result.id) return null;
    return result as Certificate;
  },
  add: async (cert: Certificate): Promise<Certificate[]> => {
    await ensureInitialized();
    dbInstance.run("INSERT INTO certificates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [cert.id, cert.name, cert.issuer, cert.issueDate, cert.level, cert.category, cert.credentialUrl || "", cert.hours || 0, cert.timestamp]);
    saveDatabase();
    return CertificateDatabase.getAll();
  },
  update: async (cert: Certificate): Promise<Certificate[]> => {
    await ensureInitialized();
    dbInstance.run(`UPDATE certificates SET name = ?, issuer = ?, issueDate = ?, level = ?, category = ?, credentialUrl = ?, hours = ?, timestamp = ? WHERE id = ?`, [cert.name, cert.issuer, cert.issueDate, cert.level, cert.category, cert.credentialUrl || "", cert.hours || 0, cert.timestamp, cert.id]);
    saveDatabase();
    return CertificateDatabase.getAll();
  },
  delete: async (id: string): Promise<Certificate[]> => {
    await ensureInitialized();
    dbInstance.run("DELETE FROM certificates WHERE id = ?", [id]);
    saveDatabase();
    return CertificateDatabase.getAll();
  }
};

export const ExamAnalysisDatabase = {
  initialize: ensureInitialized,
  getAll: async (): Promise<ExamAnalysis[]> => {
    await ensureInitialized();
    const result = dbInstance.exec("SELECT * FROM exam_analyses ORDER BY timestamp DESC");
    if (result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map((row: any[]) => {
      const a: any = {};
      columns.forEach((col: string, index: number) => {
        if (['knowledgePoints', 'itemAnalysis'].includes(col)) {
          try { a[col] = JSON.parse(row[index]); } catch { a[col] = []; }
        } else {
          a[col] = row[index];
        }
      });
      return a as ExamAnalysis;
    });
  },
  add: async (analysis: ExamAnalysis): Promise<ExamAnalysis[]> => {
    await ensureInitialized();
    dbInstance.run(
      "INSERT INTO exam_analyses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        analysis.id,
        analysis.timestamp,
        analysis.subject,
        analysis.title,
        analysis.grade,
        analysis.difficulty,
        analysis.summary,
        JSON.stringify(analysis.knowledgePoints),
        JSON.stringify(analysis.itemAnalysis),
        analysis.teachingAdvice,
        analysis.imageUrl || ""
      ]
    );
    saveDatabase();
    return ExamAnalysisDatabase.getAll();
  },
  delete: async (id: string): Promise<ExamAnalysis[]> => {
    await ensureInitialized();
    dbInstance.run("DELETE FROM exam_analyses WHERE id = ?", [id]);
    saveDatabase();
    return ExamAnalysisDatabase.getAll();
  }
};

export const EventsDatabase = {
  initialize: ensureInitialized,
  getAll: async (): Promise<ScheduleEvent[]> => {
    await ensureInitialized();
    const result = dbInstance.exec("SELECT * FROM events");
    if (result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map((row: any[]) => {
      const e: any = {};
      columns.forEach((col: string, index: number) => {
          if (col === 'participants') {
              try { e[col] = JSON.parse(row[index]); } catch { e[col] = []; }
          } else {
              e[col] = row[index];
          }
      });
      return e as ScheduleEvent;
    });
  },
  add: async (event: ScheduleEvent): Promise<ScheduleEvent[]> => {
    await ensureInitialized();
    dbInstance.run("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        event.id, 
        event.title, 
        event.date, 
        event.startTime, 
        event.endTime, 
        event.type, 
        event.description || "",
        JSON.stringify(event.participants || [])
    ]);
    saveDatabase();
    return EventsDatabase.getAll();
  },
  delete: async (id: string): Promise<ScheduleEvent[]> => {
    await ensureInitialized();
    dbInstance.run("DELETE FROM events WHERE id = ?", [id]);
    saveDatabase();
    return EventsDatabase.getAll();
  }
};

export const EventTypeDatabase = {
  initialize: ensureInitialized,
  getAll: async (): Promise<EventTypeTag[]> => {
      await ensureInitialized();
      const result = dbInstance.exec("SELECT * FROM event_types");
      if (result.length === 0) return [];
      const columns = result[0].columns;
      const values = result[0].values;
      return values.map((row: any[]) => {
          const t: any = {};
          columns.forEach((col: string, index: number) => { t[col] = row[index]; });
          return t as EventTypeTag;
      });
  },
  add: async (name: string, colorClass: string): Promise<EventTypeTag[]> => {
      await ensureInitialized();
      const id = `et_${Date.now()}`;
      dbInstance.run("INSERT INTO event_types VALUES (?, ?, ?)", [id, name, colorClass]);
      saveDatabase();
      return EventTypeDatabase.getAll();
  },
  delete: async (id: string): Promise<EventTypeTag[]> => {
      await ensureInitialized();
      dbInstance.run("DELETE FROM event_types WHERE id = ?", [id]);
      saveDatabase();
      return EventTypeDatabase.getAll();
  }
};

export const PromptDatabase = {
  initialize: ensureInitialized,
  getAll: async (category?: string): Promise<PromptTemplate[]> => {
    await ensureInitialized();
    const query = category ? `SELECT * FROM prompts WHERE category = '${category}' ORDER BY timestamp DESC` : "SELECT * FROM prompts ORDER BY timestamp DESC";
    const result = dbInstance.exec(query);
    if (result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map((row: any[]) => {
      const p: any = {};
      columns.forEach((col: string, index: number) => {
        if (col === 'isDefault') p[col] = row[index] === 1;
        else p[col] = row[index];
      });
      return p as PromptTemplate;
    });
  },
  add: async (prompt: PromptTemplate): Promise<PromptTemplate[]> => {
    await ensureInitialized();
    if (prompt.isDefault) {
      dbInstance.run(`UPDATE prompts SET isDefault = 0 WHERE category = '${prompt.category}'`);
    }
    dbInstance.run("INSERT INTO prompts VALUES (?, ?, ?, ?, ?, ?)", [prompt.id, prompt.name, prompt.content, prompt.isDefault ? 1 : 0, prompt.timestamp, prompt.category]);
    saveDatabase();
    return PromptDatabase.getAll(prompt.category);
  },
  delete: async (id: string, category: string): Promise<PromptTemplate[]> => {
    await ensureInitialized();
    dbInstance.run("DELETE FROM prompts WHERE id = ?", [id]);
    saveDatabase();
    return PromptDatabase.getAll(category);
  }
};

export const FileManager = {
    initialize: ensureInitialized,
    saveFile: async (file: File): Promise<string> => {
        await ensureInitialized();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    dbInstance.run(
                        "INSERT INTO uploads VALUES (?, ?, ?, ?, ?, ?)",
                        [id, file.name, file.type, base64, file.size, Date.now()]
                    );
                    saveDatabase();
                    resolve(`file://${id}`);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    getFile: async (uri: string): Promise<StoredFile | null> => {
        await ensureInitialized();
        if (!uri.startsWith('file://')) return null;
        
        const id = uri.replace('file://', '');
        const stmt = dbInstance.prepare("SELECT * FROM uploads WHERE id = :id");
        const result = stmt.getAsObject({':id': id});
        stmt.free();
        
        if (!result || !result.id) return null;
        return result as StoredFile;
    },
    resolveToDataUrl: async (uri: string): Promise<string | null> => {
        const file = await FileManager.getFile(uri);
        if (!file) return null;
        return `data:${file.mimeType};base64,${file.data}`;
    },
    deleteFile: async (uri: string) => {
        await ensureInitialized();
        if (!uri.startsWith('file://')) return;
        const id = uri.replace('file://', '');
        dbInstance.run("DELETE FROM uploads WHERE id = ?", [id]);
        saveDatabase();
    }
};

export const DatabaseManager = {
    exportDatabase: async (): Promise<Uint8Array | null> => {
        await ensureInitialized();
        if (dbInstance) {
            return dbInstance.export();
        }
        return null;
    },
    importDatabase: async (data: Uint8Array): Promise<boolean> => {
        try {
            await ensureInitialized();
            dbInstance = new SQL.Database(data);
            saveDatabase(); 
            return true;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    }
};
