/**
 * Agent Framework Type Definitions
 * Helerix OA - AI Agent Infrastructure
 */

// ============================================
// Core Agent Types
// ============================================

export type AgentId = 'exam-analysis' | 'critic' | 'lesson-planner' | 'performance-analyzer';

export type AgentCategory = 'analysis' | 'critique' | 'generation' | 'evaluation';

export type AgentStatus = 'idle' | 'processing' | 'streaming' | 'error' | 'complete';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  inputTypes: ('text' | 'image' | 'pdf' | 'json')[];
  outputType: 'json' | 'text' | 'stream';
}

// ============================================
// Agent Configuration
// ============================================

export interface AgentConfig {
  id: AgentId;
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  category: AgentCategory;
  icon: string;
  capabilities: AgentCapability[];
  defaultPrompt: string;
  promptCategory: string;
  supportedProviders: ('gemini' | 'openai-compatible')[];
  temperature?: number;
  maxTokens?: number;
}

// ============================================
// Agent Input/Output Types
// ============================================

export interface AgentAttachment {
  type: 'image' | 'pdf';
  data: string;  // Base64
  name: string;
  mimeType: string;
}

export interface AgentInput {
  text?: string;
  attachments?: AgentAttachment[];
  context?: Record<string, unknown>;
  promptOverride?: string;
}

export interface AgentOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  processingTime?: number;
  providerId: string;
}

export interface StreamingAgentOutput {
  chunk: string;
  isComplete: boolean;
  fullText?: string;
}

// ============================================
// Agent Session Types
// ============================================

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  attachments?: AgentAttachment[];
  timestamp: number;
  isError?: boolean;
}

export interface AgentSession {
  id: string;
  agentId: AgentId;
  title: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// Provider Types
// ============================================

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'gemini' | 'openai-compatible';
  baseUrl?: string;
  apiKey: string;
  modelId: string;
  isDefault?: boolean;
}

// ============================================
// Exam Analysis Agent Specific Types
// ============================================

export interface ExamAnalysisOutput {
  title: string;
  subject: string;
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
}

// ============================================
// Critic Agent Specific Types
// ============================================

export interface CriticOutput {
  critique: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallRating?: number;
}

// ============================================
// Lesson Planner Agent Specific Types
// ============================================

export interface LessonPlanOutput {
  title: string;
  subject: string;
  grade: string;
  duration: string;
  objectives: string[];
  materials: string[];
  procedure: {
    phase: string;
    duration: string;
    activities: string;
  }[];
  assessment: string;
  differentiation: string;
  homework?: string;
}

// ============================================
// Performance Analyzer Agent Specific Types
// ============================================

export interface PerformanceAnalysisOutput {
  summary: string;
  averageScore: number;
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  topPerformers: string[];
  needsImprovement: string[];
  recommendations: string[];
  trendAnalysis?: string;
}

// ============================================
// Agent Registry Entry
// ============================================

export interface AgentRegistryEntry {
  config: AgentConfig;
  isEnabled: boolean;
  usageCount: number;
  lastUsed?: number;
}
