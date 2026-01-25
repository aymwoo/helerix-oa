/**
 * CriticAgent - AI agent for proposal critique
 * Helerix OA - AI Agent Infrastructure
 */

import { BaseAgent } from "./BaseAgent";
import {
    AgentConfig,
    AgentInput,
    CriticOutput,
} from "./types";

const CRITIC_CONFIG: AgentConfig = {
    id: "critic",
    name: "AI Critic Agent",
    nameCn: "AI 批评者",
    description: "Provides rigorous critique and stress-testing of educational proposals and plans",
    descriptionCn: "对教研方案进行严格的批评性分析和压力测试",
    category: "critique",
    icon: "gavel",
    capabilities: [
        {
            id: "proposal-critique",
            name: "Proposal Critique",
            description: "Analyze and critique educational proposals",
            inputTypes: ["text", "image", "pdf"],
            outputType: "stream",
        },
        {
            id: "logic-check",
            name: "Logic Validation",
            description: "Check for logical fallacies and inconsistencies",
            inputTypes: ["text"],
            outputType: "stream",
        },
        {
            id: "feasibility-analysis",
            name: "Feasibility Analysis",
            description: "Assess practical feasibility of proposals",
            inputTypes: ["text", "image"],
            outputType: "stream",
        },
    ],
    defaultPrompt: `你是一个严厉、直言不讳且逻辑严密的资深教研评审专家。

你的任务是阅读用户的教研方案或想法，对其进行"压力测试"。

分析维度：
1. 逻辑严密性：方案中是否存在逻辑漏洞或自相矛盾之处？
2. 数据支撑：是否有充分的数据或案例支撑核心论点？
3. 可行性：在实际教学中实施的难点和障碍是什么？
4. 创新性：与现有方法相比，有何突破？是否只是"新瓶装旧酒"？
5. 潜在风险：可能导致的负面效果或资源浪费？

输出格式应该是结构化的批评。请保持专业，但语气要带有压迫感。

不要轻易认同，要像一个严厉的导师那样挑战每一个假设。`,
    promptCategory: "critic",
    supportedProviders: ["gemini", "openai-compatible"],
    temperature: 0.6,
    maxTokens: 2000,
};

export class CriticAgent extends BaseAgent<CriticOutput | string> {
    private conversationHistory: Array<{ role: string; content: string }> = [];

    constructor() {
        super(CRITIC_CONFIG);
    }

    /**
     * Critic agent uses streaming by default, so no structured schema
     */
    protected getOutputSchema(): null {
        return null;
    }

    protected parseResponse(rawResponse: string): string {
        // For streaming responses, we return the raw text
        return rawResponse;
    }

    /**
     * Parse structured critique if needed
     */
    parseStructuredCritique(rawResponse: string): CriticOutput {
        // Attempt to extract structured critique from free-form text
        const lines = rawResponse.split("\n");

        const strengths: string[] = [];
        const weaknesses: string[] = [];
        const suggestions: string[] = [];

        let currentSection = "";

        for (const line of lines) {
            const lowerLine = line.toLowerCase();

            if (lowerLine.includes("优点") || lowerLine.includes("strengths") || lowerLine.includes("亮点")) {
                currentSection = "strengths";
                continue;
            }
            if (lowerLine.includes("问题") || lowerLine.includes("weaknesses") || lowerLine.includes("缺点") || lowerLine.includes("不足")) {
                currentSection = "weaknesses";
                continue;
            }
            if (lowerLine.includes("建议") || lowerLine.includes("suggestions") || lowerLine.includes("改进")) {
                currentSection = "suggestions";
                continue;
            }

            // Extract bullet points
            const bulletMatch = line.match(/^[\s]*[-•*\d.]\s*(.+)/);
            if (bulletMatch && bulletMatch[1].trim()) {
                const content = bulletMatch[1].trim();
                switch (currentSection) {
                    case "strengths":
                        strengths.push(content);
                        break;
                    case "weaknesses":
                        weaknesses.push(content);
                        break;
                    case "suggestions":
                        suggestions.push(content);
                        break;
                }
            }
        }

        return {
            critique: rawResponse,
            strengths,
            weaknesses,
            suggestions,
        };
    }

    protected buildPrompt(input: AgentInput): string {
        const basePrompt = input.promptOverride || this.config.defaultPrompt;

        let prompt = basePrompt;

        // Add conversation context for multi-turn
        if (this.conversationHistory.length > 0) {
            const recentHistory = this.conversationHistory.slice(-4);
            prompt += "\n\n--- 对话历史 ---\n";
            for (const msg of recentHistory) {
                const roleLabel = msg.role === "user" ? "用户" : "批评者";
                prompt += `${roleLabel}: ${msg.content}\n`;
            }
            prompt += "--- 对话历史结束 ---\n";
        }

        if (input.text) {
            prompt += `\n\n用户输入：\n${input.text}`;
        }

        if (input.attachments && input.attachments.length > 0) {
            prompt += `\n\n[用户附加了 ${input.attachments.length} 个文件]`;
        }

        return prompt;
    }

    /**
     * Add message to conversation history
     */
    addToHistory(role: "user" | "agent", content: string): void {
        this.conversationHistory.push({ role, content });

        // Keep only last 10 messages
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory(): void {
        this.conversationHistory = [];
    }

    /**
     * Get conversation history
     */
    getHistory(): Array<{ role: string; content: string }> {
        return [...this.conversationHistory];
    }
}

// Singleton instance
let instance: CriticAgent | null = null;

export function getCriticAgent(): CriticAgent {
    if (!instance) {
        instance = new CriticAgent();
    }
    return instance;
}
