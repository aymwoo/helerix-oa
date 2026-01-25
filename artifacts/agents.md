# Helerix OA System - Agents Documentation

> **Generated:** 2026-01-25  
> **Updated:** 2026-01-25 (Instantiated)  
> **Project:** Helerix OA - 教研协作系统 (Educational Research Collaboration System)  
> **Tech Stack:** React + TypeScript + Vite + Google Gemini AI

---

## ✅ Instantiation Status

| Component | Status | Location |
|-----------|--------|----------|
| **Agent Types** | ✅ Complete | `agents/types.ts` |
| **Base Agent** | ✅ Complete | `agents/BaseAgent.ts` |
| **Exam Analysis Agent** | ✅ Complete | `agents/ExamAnalysisAgent.ts` |
| **Critic Agent** | ✅ Complete | `agents/CriticAgent.ts` |
| **Lesson Planner Agent** | ✅ NEW | `agents/LessonPlannerAgent.ts` |
| **Performance Analyzer Agent** | ✅ NEW | `agents/PerformanceAnalyzerAgent.ts` |
| **Agent Registry** | ✅ Complete | `agents/AgentRegistry.ts` |
| **Module Index** | ✅ Complete | `agents/index.ts` |

---

## 📋 Executive Summary

The **Helerix OA System** is an AI-powered Office Automation platform designed for **educational research professionals (教研员)**. It provides intelligent tools for exam analysis, proposal critique, schedule management, and professional credential tracking. The system integrates with **Google Gemini AI** and supports custom OpenAI-compatible providers for advanced AI functionalities.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Helerix OA Frontend                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │   Sidebar   │  │                 Main Content Area                │  │
│  │  Navigation │  │  ┌─────────────────────────────────────────────┐ │  │
│  │             │  │  │ Schedule | Users | Certificates | AI Tools  │ │  │
│  │ - 教研排期   │  │  └─────────────────────────────────────────────┘ │  │
│  │ - 教研员管理  │  │                                                 │  │
│  │ - 专业档案   │  │       ┌─────────────────────────────────────┐  │  │
│  │ - AI 试卷分析 │  │       │          View Components            │  │  │
│  │ - AI 批评者  │  │       │  (12 specialized view modules)      │  │  │
│  │ - 系统设置   │  │       └─────────────────────────────────────┘  │  │
│  └─────────────┘  └─────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                        Local SQLite Database (sql.js)                  │
│  ┌──────────┬───────────┬───────────┬─────────┬─────────┬───────────┐  │
│  │  users   │certificates│ events   │ prompts │ uploads │ sessions  │  │
│  └──────────┴───────────┴───────────┴─────────┴─────────┴───────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                          AI Provider Layer                             │
│  ┌─────────────────────────┬─────────────────────────────────────────┐ │
│  │  Google Gemini (Default)│     Custom OpenAI-Compatible Providers  │ │
│  │  - gemini-3-pro-preview │     - Configurable base URL, API key    │ │
│  │  - Vision + Text        │     - Streaming response support        │ │
│  └─────────────────────────┴─────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Agents Inventory

### Agent 1: AI 试卷分析 (Exam Analysis Agent)

| Property | Details |
|----------|---------|
| **File** | `views/AIExamAnalysis.tsx` |
| **Purpose** | Analyzes uploaded exam papers using AI vision capabilities |
| **Model** | `gemini-3-pro-preview` (default) or custom provider |
| **Input** | Exam paper images (upload or paste via Ctrl+V) |
| **Output** | Structured JSON analysis report |

#### Capabilities:
- **OCR Extraction**: Automatically extracts question text from exam images
- **Knowledge Point Analysis**: Identifies and categorizes covered knowledge points
- **Difficulty Assessment**: Rates exam difficulty on a 1-10 scale
- **Item-by-Item Analysis**: Provides insights for each question
- **Teaching Recommendations**: Generates pedagogical advice based on exam content

#### Output Schema:
```typescript
interface ExamAnalysis {
  id: string;
  timestamp: number;
  subject: string;           // e.g., "数学", "语文"
  title: string;             // Exam title
  grade: string;             // Target grade level
  difficulty: number;        // 1-10 scale
  summary: string;           // Overall assessment
  knowledgePoints: string[]; // List of topics covered
  itemAnalysis: {
    question: string;
    point: string;
    insight: string;
  }[];
  teachingAdvice: string;    // Pedagogical recommendations
  imageUrl?: string;         // Original exam image
}
```

#### Prompt System:
- Supports **versioned prompts** stored in database
- Category: `"exam"`
- Administrators can create, save, and switch between prompt templates

---

### Agent 2: AI 批评者 (AI Critic Agent)

| Property | Details |
|----------|---------|
| **File** | `views/AICritic.tsx` |
| **Purpose** | Provides rigorous critique of educational proposals |
| **Model** | `gemini-3-pro-preview` (default) or custom provider |
| **Input** | Text descriptions, images, or PDF attachments |
| **Output** | Streaming conversational critique |

#### Capabilities:
- **Multi-modal Input**: Accepts text, images, and PDF documents
- **Conversational Memory**: Maintains context over multiple exchanges
- **Session Persistence**: Saves critique sessions for future reference
- **Streaming Response**: Real-time text generation feedback

#### Agent Personality:
```
你是一个严厉、直言不讳且逻辑严密的资深教研评审专家。
你的任务是阅读用户的教研方案或想法，对其进行"压力测试"。
输出格式应该是结构化的批评。请保持专业，但语气要带有压迫感。
```

#### Message Structure:
```typescript
interface CriticMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: { type: 'image' | 'pdf'; data: string; name: string }[];
  isError?: boolean;
}

interface CriticSession {
  id: string;
  title: string;
  timestamp: number;
  messages: CriticMessage[];
}
```

#### Prompt System:
- Category: `"critic"`
- System instruction is customizable via database-stored prompts

---

## 🗄️ Data Models

### User Management
```typescript
enum UserRole {
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
  IT = "信息技术教研员"
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];    // Multiple roles supported
  department: string;
  status: UserStatus;   // Active | Offline | Inactive
  avatarUrl: string;
  bio?: string;
  phone?: string;
  joinDate?: string;
  expertise?: string[];
}
```

### Certificate / Professional Credentials
```typescript
enum HonorLevel {
  National = "国家级",
  Provincial = "省级",
  Municipal = "市级",
  District = "区县级",
  School = "校级"
}

enum CertificateCategory {
  Award = "荣誉表彰",
  Project = "课题结项",
  Training = "培训结业",
  Qualification = "职称资格",
  Other = "其他成果"
}

interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  level: HonorLevel;
  category: CertificateCategory;
  credentialUrl?: string;
  hours?: number;      // Training hours
  timestamp: number;
}
```

### Schedule Events
```typescript
interface ScheduleEvent {
  id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  type: string;        // Dynamic tags from event_types table
  description?: string;
  participants?: string[];
}

interface EventTypeTag {
  id: string;
  name: string;
  colorClass: string;  // CSS class for visual styling
}
```

---

## 🔌 AI Provider Configuration

### Default Provider: Google Gemini
```typescript
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  contents: { parts: [...] },
  config: {
    responseMimeType: "application/json",
    responseSchema: {...}
  }
});
```

### Custom OpenAI-Compatible Providers
```typescript
interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;    // e.g., "https://api.openai.com/v1"
  apiKey: string;
  modelId: string;    // e.g., "gpt-4-vision-preview"
}

// Storage: localStorage key 'helerix_custom_providers'
```

---

## 📁 View Components Matrix

| View | File | Purpose | AI Features |
|------|------|---------|-------------|
| Schedule | `Schedule.tsx` | 教研排期管理 | ❌ |
| UserList | `UserList.tsx` | 教研员列表 | ❌ |
| UserProfile | `UserProfile.tsx` | 用户详情页 | ❌ |
| CertificateList | `CertificateList.tsx` | 专业档案列表 | ❌ |
| CertificateDetail | `CertificateDetail.tsx` | 证书详情 | ❌ |
| **AIExamAnalysis** | `AIExamAnalysis.tsx` | **AI 试卷分析** | ✅ Vision + JSON |
| **AICritic** | `AICritic.tsx` | **AI 批评者** | ✅ Chat + Streaming |
| AIConfig | `AIConfig.tsx` | AI 配置管理 | ⚙️ Settings |
| AIProviderConfig | `AIProviderConfig.tsx` | 自定义 Provider | ⚙️ Settings |
| SystemSettings | `SystemSettings.tsx` | 系统设置 | ⚙️ Settings |
| MyProfile | `MyProfile.tsx` | 个人中心 | ❌ |
| Dashboard | `Dashboard.tsx` | 仪表板 | ❌ |

---

## 🗃️ Database Schema (sql.js / SQLite)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  roles TEXT,          -- JSON array
  department TEXT,
  status TEXT,
  avatarUrl TEXT,
  bio TEXT,
  phone TEXT,
  joinDate TEXT,
  expertise TEXT       -- JSON array
);

-- Certificates table
CREATE TABLE certificates (
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

-- Exam analyses table
CREATE TABLE exam_analyses (
  id TEXT PRIMARY KEY,
  timestamp INTEGER,
  subject TEXT,
  title TEXT,
  grade TEXT,
  difficulty INTEGER,
  summary TEXT,
  knowledgePoints TEXT,  -- JSON array
  itemAnalysis TEXT,     -- JSON array
  teachingAdvice TEXT,
  imageUrl TEXT
);

-- AI Critic sessions table
CREATE TABLE critic_sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  timestamp INTEGER,
  messages TEXT          -- JSON array of CriticMessage
);

-- Prompt templates table
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  name TEXT,
  content TEXT,
  isDefault INTEGER,
  timestamp INTEGER,
  category TEXT          -- "exam" | "certificate" | "critic"
);

-- Schedule events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT,
  date TEXT,
  startTime TEXT,
  endTime TEXT,
  type TEXT,
  description TEXT,
  participants TEXT      -- JSON array
);

-- Event type tags table
CREATE TABLE event_types (
  id TEXT PRIMARY KEY,
  name TEXT,
  colorClass TEXT
);

-- File uploads table
CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  name TEXT,
  mimeType TEXT,
  data TEXT,             -- Base64 encoded
  size INTEGER,
  timestamp INTEGER
);
```

---

## 🔑 Environment Configuration

```bash
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note:** The API key is accessed via `process.env.API_KEY` in the codebase.

---

## 🚀 Running the Application

```bash
# Prerequisites: Node.js installed

# 1. Install dependencies
npm install

# 2. Configure environment
# Edit .env.local with your Gemini API key

# 3. Run development server
npm run dev
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` | UI Framework |
| `@google/genai` | Google Gemini AI SDK |
| `sql.js` | In-browser SQLite database |
| `vite` | Build tool & dev server |

---

## 🎨 Design System

The application uses a modern, soft UI design with:
- **Primary Color**: Violet/Purple (`primary`)
- **Background**: Light gray (`background-light`, `surface-light`)
- **Text**: Main text + muted text hierarchy
- **Borders**: Subtle light borders (`border-light`)
- **Animations**: Fade-in, slide-in transitions
- **Typography**: Inter/Roboto style fonts

---

## � Agent Framework Usage

### Quick Start

```typescript
import { 
  getAgentRegistry, 
  getExamAnalysisAgent, 
  getCriticAgent,
  getLessonPlannerAgent,
  getPerformanceAnalyzerAgent,
  ProviderConfig 
} from './agents';

// Configure provider
const provider: ProviderConfig = {
  id: 'gemini',
  name: 'Google Gemini',
  type: 'gemini',
  apiKey: process.env.API_KEY || '',
  modelId: 'gemini-3-pro-preview'
};

// Method 1: Direct agent usage
const examAgent = getExamAnalysisAgent();
const result = await examAgent.execute(
  { attachments: [{ type: 'image', data: base64Data, name: 'exam.jpg', mimeType: 'image/jpeg' }] },
  provider
);

// Method 2: Registry-based access
const registry = getAgentRegistry();
const allAgents = registry.getAgentConfigs();
const specificAgent = registry.getAgent('critic');
```

### Streaming Responses (AI Critic)

```typescript
const criticAgent = getCriticAgent();

for await (const chunk of criticAgent.executeStream(
  { text: '我计划开展项目式学习，主题是"校园生态调查"...' },
  provider
)) {
  console.log(chunk.chunk);  // Stream each text chunk
  if (chunk.isComplete) {
    console.log('Final:', chunk.fullText);
  }
}
```

### Agent Configuration Schema

```typescript
interface AgentConfig {
  id: AgentId;                              // Unique identifier
  name: string;                             // English name
  nameCn: string;                           // Chinese name
  description: string;                      // English description
  descriptionCn: string;                    // Chinese description
  category: 'analysis' | 'critique' | 'generation' | 'evaluation';
  icon: string;                             // Material icon name
  capabilities: AgentCapability[];          // List of capabilities
  defaultPrompt: string;                    // System prompt
  promptCategory: string;                   // For database prompt storage
  supportedProviders: ('gemini' | 'openai-compatible')[];
  temperature?: number;                     // AI temperature (0-1)
  maxTokens?: number;                       // Max response tokens
}
```

---

## 📌 Future Enhancement Opportunities

1. **Additional AI Agents**:
   - Curriculum alignment checker
   - Parent communication assistant
   - Question bank generator

2. **Backend Integration**:
   - Replace sql.js with cloud database
   - User authentication system
   - Multi-tenant organization support

3. **Export Capabilities**:
   - PDF report generation
   - Excel data exports
   - API integrations with educational platforms

---

*Document generated and instantiated by Antigravity Agent*
