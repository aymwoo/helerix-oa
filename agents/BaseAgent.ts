/**
 * BaseAgent - Abstract base class for all AI agents
 * Helerix OA - AI Agent Infrastructure
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
    AgentConfig,
    AgentInput,
    AgentOutput,
    AgentStatus,
    ProviderConfig,
    StreamingAgentOutput,
} from "./types";

export abstract class BaseAgent<TOutput = unknown> {
    protected config: AgentConfig;
    protected status: AgentStatus = "idle";
    protected currentProvider: ProviderConfig | null = null;
    protected abortController: AbortController | null = null;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    // ============================================
    // Abstract Methods (Must be implemented)
    // ============================================

    /**
     * Define the JSON schema for structured output
     */
    protected abstract getOutputSchema(): Record<string, unknown> | null;

    /**
     * Process the raw AI response into typed output
     */
    protected abstract parseResponse(rawResponse: string): TOutput;

    /**
     * Build the prompt with context and user input
     */
    protected abstract buildPrompt(input: AgentInput): string;

    // ============================================
    // Public API
    // ============================================

    /**
     * Execute the agent with given input
     */
    async execute(
        input: AgentInput,
        provider: ProviderConfig
    ): Promise<AgentOutput<TOutput>> {
        const startTime = Date.now();
        this.status = "processing";
        this.currentProvider = provider;

        try {
            const prompt = this.buildPrompt(input);
            let rawResponse: string;

            if (provider.type === "gemini") {
                rawResponse = await this.executeGemini(input, prompt, provider);
            } else {
                rawResponse = await this.executeOpenAICompatible(
                    input,
                    prompt,
                    provider
                );
            }

            const data = this.parseResponse(rawResponse);
            this.status = "complete";

            return {
                success: true,
                data,
                timestamp: Date.now(),
                processingTime: Date.now() - startTime,
                providerId: provider.id,
            };
        } catch (error) {
            this.status = "error";
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: Date.now(),
                processingTime: Date.now() - startTime,
                providerId: provider.id,
            };
        }
    }

    /**
     * Execute with streaming output
     */
    async *executeStream(
        input: AgentInput,
        provider: ProviderConfig
    ): AsyncGenerator<StreamingAgentOutput> {
        this.status = "streaming";
        this.currentProvider = provider;
        this.abortController = new AbortController();

        const prompt = this.buildPrompt(input);

        try {
            if (provider.type === "gemini") {
                yield* this.streamGemini(input, prompt, provider);
            } else {
                yield* this.streamOpenAICompatible(input, prompt, provider);
            }
            this.status = "complete";
        } catch (error) {
            this.status = "error";
            yield {
                chunk: "",
                isComplete: true,
                fullText: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }

    /**
     * Abort current execution
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.status = "idle";
    }

    /**
     * Get current status
     */
    getStatus(): AgentStatus {
        return this.status;
    }

    /**
     * Get agent configuration
     */
    getConfig(): AgentConfig {
        return this.config;
    }

    // ============================================
    // Provider Implementations
    // ============================================

    private async executeGemini(
        input: AgentInput,
        prompt: string,
        provider: ProviderConfig
    ): Promise<string> {
        const ai = new GoogleGenAI({ apiKey: provider.apiKey });

        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        // Add attachments
        input.attachments?.forEach((att) => {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data,
                },
            });
        });

        // Add prompt text
        parts.push({ text: prompt });

        const schema = this.getOutputSchema();
        const responseConfig: Record<string, unknown> = {
            temperature: this.config.temperature ?? 0.3,
        };

        if (schema) {
            responseConfig.responseMimeType = "application/json";
            responseConfig.responseSchema = schema;
        }

        const response = await ai.models.generateContent({
            model: provider.modelId || "gemini-3-pro-preview",
            contents: { parts },
            config: responseConfig,
        });

        return response.text || "";
    }

    private async executeOpenAICompatible(
        input: AgentInput,
        prompt: string,
        provider: ProviderConfig
    ): Promise<string> {
        let url = provider.baseUrl?.replace(/\/$/, "") || "";
        if (!url.endsWith("/chat/completions")) {
            url = `${url}/chat/completions`;
        }

        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

        // Add text
        contentParts.push({ type: "text", text: prompt });

        // Add images
        input.attachments?.forEach((att) => {
            if (att.type === "image") {
                contentParts.push({
                    type: "image_url",
                    image_url: { url: `data:${att.mimeType};base64,${att.data}` },
                });
            }
        });

        const schema = this.getOutputSchema();
        const systemPrompt = schema
            ? `You MUST respond with valid JSON matching this schema: ${JSON.stringify(schema)}`
            : "You are a helpful AI assistant.";

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: provider.modelId || "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contentParts },
                ],
                max_tokens: this.config.maxTokens ?? 2000,
                temperature: this.config.temperature ?? 0.3,
            }),
            signal: this.abortController?.signal,
        });

        if (!res.ok) {
            throw new Error(`Provider API Error: ${res.status}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("No content returned from provider");
        }

        // Clean up potential markdown fences
        return content.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    private async *streamGemini(
        input: AgentInput,
        prompt: string,
        provider: ProviderConfig
    ): AsyncGenerator<StreamingAgentOutput> {
        const ai = new GoogleGenAI({ apiKey: provider.apiKey });

        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        input.attachments?.forEach((att) => {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data,
                },
            });
        });

        parts.push({ text: prompt });

        const responseStream = await ai.models.generateContentStream({
            model: provider.modelId || "gemini-3-pro-preview",
            contents: { parts },
            config: {
                temperature: this.config.temperature ?? 0.6,
            },
        });

        let fullText = "";

        for await (const chunk of responseStream) {
            const textChunk = chunk.text || "";
            if (textChunk) {
                fullText += textChunk;
                yield {
                    chunk: textChunk,
                    isComplete: false,
                };
            }
        }

        yield {
            chunk: "",
            isComplete: true,
            fullText,
        };
    }

    private async *streamOpenAICompatible(
        input: AgentInput,
        prompt: string,
        provider: ProviderConfig
    ): AsyncGenerator<StreamingAgentOutput> {
        let url = provider.baseUrl?.replace(/\/$/, "") || "";
        if (!url.endsWith("/chat/completions")) {
            url = `${url}/chat/completions`;
        }

        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
        contentParts.push({ type: "text", text: prompt });

        input.attachments?.forEach((att) => {
            if (att.type === "image") {
                contentParts.push({
                    type: "image_url",
                    image_url: { url: `data:${att.mimeType};base64,${att.data}` },
                });
            }
        });

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: provider.modelId || "gpt-4o",
                messages: [
                    { role: "system", content: "You are a helpful AI assistant." },
                    { role: "user", content: contentParts },
                ],
                stream: true,
                temperature: this.config.temperature ?? 0.6,
            }),
            signal: this.abortController?.signal,
        });

        if (!res.ok) {
            throw new Error(`Provider Error: ${res.status}`);
        }

        if (!res.body) {
            throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === "data: [DONE]") break;
                if (trimmed.startsWith("data: ")) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices[0]?.delta?.content || "";
                        if (delta) {
                            fullText += delta;
                            yield {
                                chunk: delta,
                                isComplete: false,
                            };
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        yield {
            chunk: "",
            isComplete: true,
            fullText,
        };
    }
}
