/**
 * PerformanceAnalyzerAgent - AI agent for student performance analysis
 * Helerix OA - AI Agent Infrastructure
 * 
 * NEW AGENT: Implements the "Student Performance Analyzer" from future enhancements
 */

import { Type } from "@google/genai";
import { BaseAgent } from "./BaseAgent";
import {
    AgentConfig,
    AgentInput,
    PerformanceAnalysisOutput,
} from "./types";

const PERFORMANCE_ANALYZER_CONFIG: AgentConfig = {
    id: "performance-analyzer",
    name: "Performance Analyzer",
    nameCn: "AI 成绩分析",
    description: "Analyzes student performance data to identify trends, patterns, and provide recommendations",
    descriptionCn: "分析学生成绩数据，识别趋势模式并提供改进建议",
    category: "evaluation",
    icon: "analytics",
    capabilities: [
        {
            id: "score-analysis",
            name: "Score Distribution Analysis",
            description: "Analyze score distributions and statistics",
            inputTypes: ["text", "json"],
            outputType: "json",
        },
        {
            id: "trend-detection",
            name: "Trend Detection",
            description: "Identify performance trends over time",
            inputTypes: ["text", "json"],
            outputType: "json",
        },
        {
            id: "intervention-recommendations",
            name: "Intervention Recommendations",
            description: "Suggest interventions for struggling students",
            inputTypes: ["text", "json"],
            outputType: "json",
        },
    ],
    defaultPrompt: `你是一位教育数据分析专家。请分析用户提供的学生成绩数据，并提供深入的分析报告。

分析应包含：
1. 总体概述（平均分、及格率、优秀率等关键指标）
2. 分数分布（各分数段的人数和占比）
3. 优秀学生识别（表现突出的学生及其特点）
4. 待提升群体（需要关注的学生及可能原因）
5. 教学建议（针对班级整体和个别学生的改进建议）
6. 趋势分析（如有历史数据，分析成绩变化趋势）

请用数据说话，给出具体、可操作的建议。`,
    promptCategory: "performance",
    supportedProviders: ["gemini", "openai-compatible"],
    temperature: 0.2,
    maxTokens: 3000,
};

export class PerformanceAnalyzerAgent extends BaseAgent<PerformanceAnalysisOutput> {
    constructor() {
        super(PERFORMANCE_ANALYZER_CONFIG);
    }

    protected getOutputSchema(): Record<string, unknown> {
        return {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                averageScore: { type: Type.NUMBER },
                scoreDistribution: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            range: { type: Type.STRING },
                            count: { type: Type.INTEGER },
                            percentage: { type: Type.NUMBER },
                        },
                    },
                },
                topPerformers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                needsImprovement: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                trendAnalysis: { type: Type.STRING },
            },
            required: [
                "summary",
                "averageScore",
                "scoreDistribution",
                "topPerformers",
                "needsImprovement",
                "recommendations",
            ],
        };
    }

    protected parseResponse(rawResponse: string): PerformanceAnalysisOutput {
        try {
            const parsed = JSON.parse(rawResponse);

            // Validate required fields
            if (parsed.averageScore === undefined) {
                throw new Error("Missing averageScore in response");
            }

            return {
                summary: parsed.summary || "",
                averageScore: Number(parsed.averageScore) || 0,
                scoreDistribution: Array.isArray(parsed.scoreDistribution)
                    ? parsed.scoreDistribution.map((item: Record<string, unknown>) => ({
                        range: String(item.range || ""),
                        count: Number(item.count) || 0,
                        percentage: Number(item.percentage) || 0,
                    }))
                    : [],
                topPerformers: Array.isArray(parsed.topPerformers) ? parsed.topPerformers : [],
                needsImprovement: Array.isArray(parsed.needsImprovement) ? parsed.needsImprovement : [],
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
                trendAnalysis: parsed.trendAnalysis,
            };
        } catch (error) {
            throw new Error(`Failed to parse performance analysis response: ${error}`);
        }
    }

    protected buildPrompt(input: AgentInput): string {
        const basePrompt = input.promptOverride || this.config.defaultPrompt;

        let prompt = basePrompt;

        // Add context
        if (input.context?.subject) {
            prompt += `\n\n学科：${input.context.subject}`;
        }

        if (input.context?.examName) {
            prompt += `\n考试名称：${input.context.examName}`;
        }

        if (input.context?.className) {
            prompt += `\n班级：${input.context.className}`;
        }

        if (input.context?.totalStudents) {
            prompt += `\n学生总数：${input.context.totalStudents}`;
        }

        // Add the actual data
        if (input.text) {
            prompt += `\n\n成绩数据：\n${input.text}`;
        }

        // If JSON data is provided in context
        if (input.context?.scoreData) {
            prompt += `\n\n成绩数据（JSON格式）：\n${JSON.stringify(input.context.scoreData, null, 2)}`;
        }

        return prompt;
    }

    /**
     * Helper method to format score data for input
     */
    formatScoreData(scores: Array<{ name: string; score: number }>): string {
        let formatted = "姓名\t分数\n";
        formatted += "───────────────\n";
        for (const s of scores) {
            formatted += `${s.name}\t${s.score}\n`;
        }
        return formatted;
    }
}

// Singleton instance
let instance: PerformanceAnalyzerAgent | null = null;

export function getPerformanceAnalyzerAgent(): PerformanceAnalyzerAgent {
    if (!instance) {
        instance = new PerformanceAnalyzerAgent();
    }
    return instance;
}
