/**
 * LessonPlannerAgent - AI agent for lesson plan generation
 * Helerix OA - AI Agent Infrastructure
 * 
 * NEW AGENT: Implements the "Lesson Plan Generator" from future enhancements
 */

import { Type } from "@google/genai";
import { BaseAgent } from "./BaseAgent";
import {
    AgentConfig,
    AgentInput,
    LessonPlanOutput,
} from "./types";

const LESSON_PLANNER_CONFIG: AgentConfig = {
    id: "lesson-planner",
    name: "Lesson Plan Generator",
    nameCn: "AI 教案生成",
    description: "Generates comprehensive lesson plans based on curriculum standards and teaching objectives",
    descriptionCn: "根据课程标准和教学目标生成完整的教案",
    category: "generation",
    icon: "edit_document",
    capabilities: [
        {
            id: "plan-generation",
            name: "Lesson Plan Generation",
            description: "Generate complete lesson plans from topic input",
            inputTypes: ["text"],
            outputType: "json",
        },
        {
            id: "curriculum-alignment",
            name: "Curriculum Alignment",
            description: "Align lesson with curriculum standards",
            inputTypes: ["text"],
            outputType: "json",
        },
        {
            id: "differentiation",
            name: "Differentiated Instruction",
            description: "Add differentiation strategies for diverse learners",
            inputTypes: ["text"],
            outputType: "json",
        },
    ],
    defaultPrompt: `你是一位经验丰富的教学设计专家。请根据用户提供的教学主题和要求，设计一份完整、实用的教案。

教案应包含：
1. 教学目标（具体、可测量的学习目标）
2. 教学材料（所需资源和教具清单）
3. 教学流程（导入、讲授、练习、总结各阶段的详细安排）
4. 评价方式（如何检验学生是否达成目标）
5. 分层教学策略（针对不同水平学生的差异化教学建议）
6. 课后作业（巩固和延伸学习的任务）

请确保教案符合新课程标准的要求，注重学生核心素养的培养。`,
    promptCategory: "lesson",
    supportedProviders: ["gemini", "openai-compatible"],
    temperature: 0.4,
    maxTokens: 3000,
};

export class LessonPlannerAgent extends BaseAgent<LessonPlanOutput> {
    constructor() {
        super(LESSON_PLANNER_CONFIG);
    }

    protected getOutputSchema(): Record<string, unknown> {
        return {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                grade: { type: Type.STRING },
                duration: { type: Type.STRING },
                objectives: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                materials: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                },
                procedure: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            phase: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            activities: { type: Type.STRING },
                        },
                    },
                },
                assessment: { type: Type.STRING },
                differentiation: { type: Type.STRING },
                homework: { type: Type.STRING },
            },
            required: [
                "title",
                "subject",
                "grade",
                "duration",
                "objectives",
                "materials",
                "procedure",
                "assessment",
                "differentiation",
            ],
        };
    }

    protected parseResponse(rawResponse: string): LessonPlanOutput {
        try {
            const parsed = JSON.parse(rawResponse);

            // Validate required fields
            if (!parsed.title || !parsed.subject) {
                throw new Error("Missing required fields in response");
            }

            return {
                title: parsed.title,
                subject: parsed.subject,
                grade: parsed.grade || "",
                duration: parsed.duration || "45分钟",
                objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
                materials: Array.isArray(parsed.materials) ? parsed.materials : [],
                procedure: Array.isArray(parsed.procedure)
                    ? parsed.procedure.map((item: Record<string, string>) => ({
                        phase: item.phase || "",
                        duration: item.duration || "",
                        activities: item.activities || "",
                    }))
                    : [],
                assessment: parsed.assessment || "",
                differentiation: parsed.differentiation || "",
                homework: parsed.homework,
            };
        } catch (error) {
            throw new Error(`Failed to parse lesson plan response: ${error}`);
        }
    }

    protected buildPrompt(input: AgentInput): string {
        const basePrompt = input.promptOverride || this.config.defaultPrompt;

        let prompt = basePrompt;

        // Add subject and grade context if provided
        if (input.context?.subject) {
            prompt += `\n\n学科：${input.context.subject}`;
        }

        if (input.context?.grade) {
            prompt += `\n年级：${input.context.grade}`;
        }

        if (input.context?.duration) {
            prompt += `\n课时：${input.context.duration}`;
        }

        if (input.context?.curriculumStandard) {
            prompt += `\n课标要求：${input.context.curriculumStandard}`;
        }

        if (input.text) {
            prompt += `\n\n教学主题/要求：\n${input.text}`;
        }

        return prompt;
    }
}

// Singleton instance
let instance: LessonPlannerAgent | null = null;

export function getLessonPlannerAgent(): LessonPlannerAgent {
    if (!instance) {
        instance = new LessonPlannerAgent();
    }
    return instance;
}
