import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "helerix.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    roles TEXT NOT NULL,
    department TEXT,
    status TEXT,
    avatarUrl TEXT,
    bio TEXT,
    phone TEXT,
    password TEXT,
    joinDate TEXT,
    expertise TEXT,
    lastLogin INTEGER
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    issuer TEXT,
    issueDate TEXT,
    level TEXT,
    category TEXT,
    credentialUrl TEXT,
    hours INTEGER DEFAULT 0,
    timestamp INTEGER,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    name TEXT,
    mimeType TEXT,
    data TEXT,
    size INTEGER,
    timestamp INTEGER
  );

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

  CREATE TABLE IF NOT EXISTS critic_sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    timestamp INTEGER,
    messages TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    name TEXT,
    content TEXT,
    isDefault INTEGER DEFAULT 0,
    timestamp INTEGER,
    category TEXT
  );

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

  CREATE TABLE IF NOT EXISTS event_types (
    id TEXT PRIMARY KEY,
    name TEXT,
    colorClass TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    baseUrl TEXT NOT NULL,
    apiKey TEXT,
    modelId TEXT,
    timestamp INTEGER,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS agent_usage (
    agentId TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    lastUsed INTEGER
  );
`);

// Simple migration logic
const usersTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
if (!usersTableInfo.some((col) => col.name === "password")) {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT DEFAULT '123456'");
}
if (!usersTableInfo.some((col) => col.name === "lastLogin")) {
  db.exec("ALTER TABLE users ADD COLUMN lastLogin INTEGER");
}

const certsTableInfo = db
  .prepare("PRAGMA table_info(certificates)")
  .all() as any[];
if (!certsTableInfo.some((col) => col.name === "userId")) {
  db.exec("ALTER TABLE certificates ADD COLUMN userId TEXT");
}

const sessionsTableInfo = db
  .prepare("PRAGMA table_info(critic_sessions)")
  .all() as any[];
if (!sessionsTableInfo.some((col) => col.name === "userId")) {
  db.exec("ALTER TABLE critic_sessions ADD COLUMN userId TEXT");
}

// Initialize default prompts if not exist
const certPromptCount = db
  .prepare(
    "SELECT COUNT(*) as count FROM prompts WHERE category = 'certificate'",
  )
  .get() as { count: number };
if (certPromptCount.count === 0) {
  db.prepare(
    `
    INSERT INTO prompts (id, name, content, isDefault, timestamp, category) VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    "cert_default_v1",
    "标准档案识别预设",
    `你是一个专业的档案归档助手。请分析用户上传的图片（可能是扫描件或照片），提取其中的证书关键信息。
需要提取的字段包括：
- name: 证书名称（如"优秀教师荣誉证书"）
- issuer: 发证单位/机构
- issueDate: 颁发日期（格式：YYYY-MM-DD，如果只包含年月则补01，如果未明确日期则估算或留空）
- level: 级别（国家级、省级、市级、区县级、校级、其他）
- category: 成果类别（荣誉表彰、课题结项、培训结业、职称资格、其他成果）
- hours: 学时数（仅限培训类，如无则为0）

请以 JSON 数组格式返回提取的信息，例如：
[{"name": "xxx", "issuer": "xxx", "issueDate": "2024-01-15", "level": "省级", "category": "荣誉表彰", "hours": 0}]

如果图片中包含多个证书，请分别提取每个证书的信息。只返回 JSON 数组，不要添加任何其他说明文字。`,
    1,
    Date.now(),
    "certificate",
  );
}

const examPromptCount = db
  .prepare("SELECT COUNT(*) as count FROM prompts WHERE category = 'exam'")
  .get() as { count: number };
if (examPromptCount.count === 0) {
  db.prepare(
    `
    INSERT INTO prompts (id, name, content, isDefault, timestamp, category) VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    "exam_default_v1",
    "标准试卷分析预设",
    `你是一个专业的教研员和试卷分析专家。请分析用户上传的试卷图片，提取关键信息并进行深度研判。

请严格按照以下 JSON 格式返回分析结果（不要包含 Markdown 代码块标记）：
{
  "title": "试卷标题",
  "subject": "学科 (如：数学、语文)",
  "grade": "适用年级",
  "difficulty": 整数 (1-10，10为最难),
  "summary": "试卷整体综述与评价",
  "knowledgePoints": ["考点1", "考点2", ...],
  "itemAnalysis": [
    {
      "question": "题目描述或题号",
      "point": "考查知识点",
      "insight": "题目分析与解题思路评价"
    }
  ],
  "teachingAdvice": "针对本试卷的教学或备考建议"
}

确保返回的是标准 JSON 格式。`,
    1,
    Date.now(),
    "exam",
  );
}

const criticPromptCount = db
  .prepare("SELECT COUNT(*) as count FROM prompts WHERE category = 'critic'")
  .get() as { count: number };
if (criticPromptCount.count === 0) {
  db.prepare(
    `
    INSERT INTO prompts (id, name, content, isDefault, timestamp, category) VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    "critic_default_v1",
    "极限压力测试人设",
    `你将对我的想法进行「极限压力测试」。

默认前提：
- 我的想法存在认知偏差
- 我低估了现实阻力
- 我高估了自己的执行力和环境友好度

请你像：
- 一个挑剔的投资人
- 一个冷漠的现实主义者
- 一个失败过很多次的老手

来对它进行无情审视。

要求：
- 明确指出我「最可能自我欺骗」的地方
- 用现实案例逻辑而不是空泛理论
- 如果这个想法在80%的情况下会失败，请直接说
- 不要给“加油”“可以试试”之类的安慰性语言

最后请回答一个问题：
👉「如果这是你的人生/项目，你会不会现在就否掉它？为什么？」`,
    1,
    Date.now(),
    "critic",
  );
}

export default db;
export { DB_PATH };
