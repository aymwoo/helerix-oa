/**
 * Helerix OA - AI Agent Infrastructure
 * 
 * Central export point for the agent framework.
 * 
 * @module agents
 * 
 * @example
 * ```typescript
 * import { getAgentRegistry, getExamAnalysisAgent } from './agents';
 * 
 * // Get an agent directly
 * const examAgent = getExamAnalysisAgent();
 * 
 * // Or through the registry
 * const registry = getAgentRegistry();
 * const criticAgent = registry.getAgent('critic');
 * 
 * // Execute an agent
 * const result = await examAgent.execute(
 *   { attachments: [{ type: 'image', data: base64Data, name: 'exam.jpg', mimeType: 'image/jpeg' }] },
 *   { id: 'gemini', type: 'gemini', apiKey: 'xxx', modelId: 'gemini-3-pro-preview', name: 'Gemini' }
 * );
 * ```
 */

// Types
export * from "./types";

// Base class
export { BaseAgent } from "./BaseAgent";

// Individual agents
export { ExamAnalysisAgent, getExamAnalysisAgent } from "./ExamAnalysisAgent";
export { CriticAgent, getCriticAgent } from "./CriticAgent";
export { LessonPlannerAgent, getLessonPlannerAgent } from "./LessonPlannerAgent";
export { PerformanceAnalyzerAgent, getPerformanceAnalyzerAgent } from "./PerformanceAnalyzerAgent";

// Registry
export { getAgentRegistry } from "./AgentRegistry";

// ============================================
// Quick Start Guide
// ============================================

/**
 * # Helerix OA Agent Framework
 * 
 * ## Available Agents
 * 
 * | Agent | ID | Description |
 * |-------|-----|-------------|
 * | ExamAnalysisAgent | `exam-analysis` | Analyzes exam papers with vision AI |
 * | CriticAgent | `critic` | Critiques educational proposals |
 * | LessonPlannerAgent | `lesson-planner` | Generates lesson plans |
 * | PerformanceAnalyzerAgent | `performance-analyzer` | Analyzes student scores |
 * 
 * ## Usage Patterns
 * 
 * ### 1. Direct Agent Usage
 * ```typescript
 * const agent = getExamAnalysisAgent();
 * const result = await agent.execute(input, provider);
 * ```
 * 
 * ### 2. Streaming Responses
 * ```typescript
 * const agent = getCriticAgent();
 * for await (const chunk of agent.executeStream(input, provider)) {
 *   console.log(chunk.chunk);
 *   if (chunk.isComplete) break;
 * }
 * ```
 * 
 * ### 3. Registry-based Access
 * ```typescript
 * const registry = getAgentRegistry();
 * const agents = registry.getAgentConfigs();
 * const specificAgent = registry.getAgent('exam-analysis');
 * ```
 * 
 * ## Provider Configuration
 * 
 * The framework supports two provider types:
 * - `gemini`: Google Gemini AI (default)
 * - `openai-compatible`: Any OpenAI-compatible API
 * 
 * Providers are configured via the `ProviderConfig` interface.
 */
