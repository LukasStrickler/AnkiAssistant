import { logger } from "./logger";
import { z } from "zod";

interface OllamaRequest {
    model: string;
    prompt?: string;
    messages?: ChatMessage[];
    options?: {
        temperature?: number;
        top_p?: number;
        // ... other options
    };
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface OllamaResponse {
    model: string;
    created_at: string;
    message?: ChatMessage;
    response?: string;
    done: boolean;
}

interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

interface OllamaListResponse {
    models: OllamaModel[];
}

export interface OllamaStreamChunk {
    message?: {
        content: string;
    };
    done?: boolean;
    // Add other possible fields
}

interface ChatMessageDelta {
    content: string;
    done?: boolean;
}

interface OllamaOptions {
    temperature?: number;
    top_p?: number;
    // Include other options that might be used
}

const OllamaStreamChunkSchema = z.object({
    message: z.object({
        content: z.string()
    }).optional(),
    done: z.boolean().optional()
});

export class OllamaClient {
    private apiUrl: string;

    constructor(apiUrl = 'http://localhost:11434') {
        this.apiUrl = apiUrl;
    }

    private async request<T>(endpoint: string, params: OllamaRequest): Promise<T> {
        const response = await fetch(`${this.apiUrl}/api${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    async listModels(): Promise<string[]> {
        const response = await fetch(`${this.apiUrl}/api/tags`);
        const data = await response.json() as OllamaListResponse;
        return data.models.map((m) => m.name);
    }

    async generateChatCompletion(messages: ChatMessage[], model: string, options?: object): Promise<OllamaResponse> {
        return this.request<OllamaResponse>('/chat', {
            model,
            messages,
            options
        });
    }

    async streamChatCompletion(
        messages: ChatMessage[],
        model: string,
        options: OllamaOptions,
        onDelta: (delta: ChatMessageDelta) => void
    ): Promise<void> {
        try {
            const response = await fetch('/api/ollama/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    options,
                    stream: true
                }),
            });

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    const parsed = OllamaStreamChunkSchema.parse(JSON.parse(line));
                    if (parsed.message) {
                        onDelta({
                            content: parsed.message.content || '',
                            done: parsed.done
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Stream error:', error);
            throw error;
        }
    }

    async generateChatCompletionStream(
        messages: ChatMessage[],
        model: string,
        options: OllamaOptions
    ): Promise<ReadableStream<string>> {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                options,
                stream: true
            })
        });

        if (!response.ok || !response.body) {
            throw new Error('Failed to generate response');
        }

        return response.body.pipeThrough(new TextDecoderStream());
    }
}

// Create a default instance
export const ollamaClient = new OllamaClient();
