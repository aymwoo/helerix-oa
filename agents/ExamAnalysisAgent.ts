/**
 * ExamAnalysisAgent - AI agent for exam paper analysis
 * Helerix OA - AI Agent Infrastructure
 */

import { Type } from "@google/genai";
import { BaseAgent } from "./BaseAgent";
import {
    AgentConfig,
    AgentInput,
    ExamAnalysisOutput,
} from "./types";

const EXAM_ANALYSIS_CONFIG: AgentConfig = {
    id: "exam-analysis",
    name: "Exam Analysis Agent",
    nameCn: "AI 试卷分析",
    description: "Analyzes exam papers to extract knowledge points, difficulty assessment, and teaching recommendations",
    descriptionCn: "分析试卷，提取考点分布、难度评估和教学建议",
    category: "analysis",
    icon: "psychology",
    capabilities: [
        {
            id: "ocr-extraction",
            name: "OCR Extraction",
            description: "Extract text from exam paper images",
            inputTypes: ["image"],
            outputType: "json",
        },
        {
            id: "knowledge-mapping",
            name: "Knowledge Point Mapping",
            description: "Map questions to curriculum knowledge points",
            inputTypes: ["text", "image"],
            outputType: "json",
        },
        {
            id: "difficulty-assessment",
            name: "Difficulty Assessment",
            description: "Assess overall and per-question difficulty",
            inputTypes: ["text", "image"],
            outputType: "json",
        },
    ],
    defaultPrompt: `你是一位资深的教研专家，请仔细分析这份试卷图片。

请完成以下任务：
1. 识别试卷的学科、年级和标题
2. 评估整体难度（1-10分）
3. 提取涉及的核心知识点
4. 对典型题目进行逐一分析
5. 给出针对性的教学建议

请以结构化的方式输出分析结果。`,
    promptCategory: "exam",
    supportedProviders: ["gemini", "openai-compatible"],
    temperature: 0.2,
    maxTokens: 3000,
};

export class ExamAnalysisAgent extends BaseAgent<ExamAnalysisOutput> {
    constructor() {
        super(EXAM_ANALYSIS_CONFIG);
    }

    protected getOutputSchema(): Record<string, unknown> {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                grade: { type: Type.STRING },
                difficulty: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                knowledgePoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                itemAnalysis: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            point: { type: Type.STRING },
                            insight: { type: Type.STRING },
                        },
                    },
                },
                teachingAdvice: { type: Type.STRING },
            },
            required: [
                "title",
                "subject",
                "grade",
                "difficulty",
                "summary",
                "knowledgePoints",
                "itemAnalysis",
                "teachingAdvice",
            ],
        };
    }

    protected parseResponse(rawResponse: string): ExamAnalysisOutput {
        try {
            const parsed = JSON.parse(rawResponse);

            // Validate required fields
            if (!parsed.title || !parsed.subject || !parsed.grade) {
                throw new Error("Missing required fields in response");
            }

            return {
                title: parsed.title,
                subject: parsed.subject,
                grade: parsed.grade,
                difficulty: Number(parsed.difficulty) || 5,
                summary: parsed.summary || "",
                knowledgePoints: Array.isArray(parsed.knowledgePoints)
                    ? parsed.knowledgePoints
                    : [],
                itemAnalysis: Array.isArray(parsed.itemAnalysis)
                    ? parsed.itemAnalysis.map((item: Record<string, string>) => ({
                        question: item.question || "",
                        point: item.point || "",
                        insight: item.insight || "",
                    }))
                    : [],
                teachingAdvice: parsed.teachingAdvice || "",
            };
        } catch (error) {
            throw new Error(`Failed to parse exam analysis response: ${error}`);
        }
    }

    protected buildPrompt(input: AgentInput): string {
        const basePrompt = input.promptOverride || this.config.defaultPrompt;

        let prompt = basePrompt;

        // Add any additional context
        if (input.context?.subject) {
            prompt += `\n\n学科提示：${input.context.subject}`;
        }

        if (input.context?.grade) {
            prompt += `\n年级提示：${input.context.grade}`;
        }

        if (input.text) {
            prompt += `\n\n用户补充说明：${input.text}`;
        }

        return prompt;
    }
}

// Singleton instance
let instance: ExamAnalysisAgent | null = null;

export function getExamAnalysisAgent(): ExamAnalysisAgent {
    if (!instance) {
        instance = new ExamAnalysisAgent();
    }
    return instance;
}
