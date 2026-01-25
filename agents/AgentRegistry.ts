/**
 * AgentRegistry - Central registry for all AI agents
 * Helerix OA - AI Agent Infrastructure
 */

import { BaseAgent } from "./BaseAgent";
import {
    AgentId,
    AgentConfig,
    AgentRegistryEntry,
    ProviderConfig,
} from "./types";

import { ExamAnalysisAgent, getExamAnalysisAgent } from "./ExamAnalysisAgent";
import { CriticAgent, getCriticAgent } from "./CriticAgent";
import { LessonPlannerAgent, getLessonPlannerAgent } from "./LessonPlannerAgent";
import { PerformanceAnalyzerAgent, getPerformanceAnalyzerAgent } from "./PerformanceAnalyzerAgent";

// ============================================
// Agent Registry Class
// ============================================

class AgentRegistryImpl {
    private agents: Map<AgentId, BaseAgent<unknown>> = new Map();
    private usageStats: Map<AgentId, { count: number; lastUsed?: number }> = new Map();
    private defaultProvider: ProviderConfig | null = null;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize all available agents
     */
    private initialize(): void {
        // Register all agents
        this.agents.set("exam-analysis", getExamAnalysisAgent());
        this.agents.set("critic", getCriticAgent());
        this.agents.set("lesson-planner", getLessonPlannerAgent());
        this.agents.set("performance-analyzer", getPerformanceAnalyzerAgent());

        // Initialize usage stats
        for (const id of this.agents.keys()) {
            this.usageStats.set(id, { count: 0 });
        }

        // Load usage stats from localStorage
        this.loadUsageStats();
    }

    /**
     * Get an agent by ID
     */
    getAgent<T extends BaseAgent<unknown>>(id: AgentId): T | null {
        return (this.agents.get(id) as T) || null;
    }

    /**
     * Get all registered agents
     */
    getAllAgents(): Array<{ id: AgentId; agent: BaseAgent<unknown> }> {
        const result: Array<{ id: AgentId; agent: BaseAgent<unknown> }> = [];
        this.agents.forEach((agent, id) => {
            result.push({ id, agent });
        });
        return result;
    }

    /**
     * Get agent configurations for UI display
     */
    getAgentConfigs(): AgentConfig[] {
        return this.getAllAgents().map(({ agent }) => agent.getConfig());
    }

    /**
     * Get registry entries with usage stats
     */
    getRegistryEntries(): AgentRegistryEntry[] {
        return this.getAllAgents().map(({ id, agent }) => {
            const stats = this.usageStats.get(id) || { count: 0 };
            return {
                config: agent.getConfig(),
                isEnabled: true,
                usageCount: stats.count,
                lastUsed: stats.lastUsed,
            };
        });
    }

    /**
     * Record agent usage
     */
    recordUsage(id: AgentId): void {
        const stats = this.usageStats.get(id) || { count: 0 };
        stats.count += 1;
        stats.lastUsed = Date.now();
        this.usageStats.set(id, stats);
        this.saveUsageStats();
    }

    /**
     * Set default provider
     */
    setDefaultProvider(provider: ProviderConfig): void {
        this.defaultProvider = provider;
    }

    /**
     * Get default provider
     */
    getDefaultProvider(): ProviderConfig | null {
        return this.defaultProvider;
    }

    /**
     * Load providers from localStorage
     */
    loadProviders(): ProviderConfig[] {
        try {
            const savedProviders = localStorage.getItem("helerix_custom_providers");
            if (savedProviders) {
                const providers = JSON.parse(savedProviders) as ProviderConfig[];
                return [
                    {
                        id: "gemini",
                        name: "Google Gemini",
                        type: "gemini",
                        apiKey: process.env.API_KEY || "",
                        modelId: "gemini-3-pro-preview",
                        isDefault: true,
                    },
                    ...providers.map(p => ({ ...p, type: "openai-compatible" as const })),
                ];
            }
        } catch (e) {
            console.error("Failed to load providers", e);
        }

        return [
            {
                id: "gemini",
                name: "Google Gemini",
                type: "gemini",
                apiKey: process.env.API_KEY || "",
                modelId: "gemini-3-pro-preview",
                isDefault: true,
            },
        ];
    }

    /**
     * Save usage stats to localStorage
     */
    private saveUsageStats(): void {
        try {
            const data: Record<string, { count: number; lastUsed?: number }> = {};
            this.usageStats.forEach((stats, id) => {
                data[id] = stats;
            });
            localStorage.setItem("helerix_agent_usage", JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save usage stats", e);
        }
    }

    /**
     * Load usage stats from localStorage
     */
    private loadUsageStats(): void {
        try {
            const saved = localStorage.getItem("helerix_agent_usage");
            if (saved) {
                const data = JSON.parse(saved) as Record<string, { count: number; lastUsed?: number }>;
                for (const [id, stats] of Object.entries(data)) {
                    if (this.usageStats.has(id as AgentId)) {
                        this.usageStats.set(id as AgentId, stats);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load usage stats", e);
        }
    }
}

// ============================================
// Singleton Export
// ============================================

let registryInstance: AgentRegistryImpl | null = null;

export function getAgentRegistry(): AgentRegistryImpl {
    if (!registryInstance) {
        registryInstance = new AgentRegistryImpl();
    }
    return registryInstance;
}

// ============================================
// Convenience Exports
// ============================================

export {
    ExamAnalysisAgent,
    CriticAgent,
    LessonPlannerAgent,
    PerformanceAnalyzerAgent,
    getExamAnalysisAgent,
    getCriticAgent,
    getLessonPlannerAgent,
    getPerformanceAnalyzerAgent,
};
