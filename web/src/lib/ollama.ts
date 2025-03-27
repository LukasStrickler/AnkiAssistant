import { logger } from "./logger";
import { z } from "zod";
import { type ConnectionStatus } from "@/types/connection-status";

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'anki';
    content: string;
}

export type OllamaMessageRole = 'user' | 'assistant' | 'system';

interface OllamaRequest {
    model?: string;
    prompt?: string;
    messages?: ChatMessage[];
    options?: {
        temperature?: number;
        top_p?: number;
        // ... other options
    };
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

export interface ChatMessageDelta {
    content: string;
    done?: boolean;
}

interface OllamaOptions {
    temperature?: number;
    top_p?: number;
    keep_alive?: number; // Duration in seconds to keep model in memory
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

    private async request<T>(endpoint: string, params: OllamaRequest, method: 'GET' | 'POST' = 'POST'): Promise<T> {
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (method === 'POST') {
            options.body = JSON.stringify(params);
        }

        const response = await fetch(`${this.apiUrl}/api${endpoint}`, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }


    async getConnectionStatus(): Promise<ConnectionStatus> {
        try {
            const response = await fetch(`${this.apiUrl}/api/tags`);
            const data = await response.json() as OllamaListResponse;
            return data.models.length > 0 ? 'connected' : 'error';
        } catch (error) {
            logger.error('Failed to get connection status', error)
            return 'disconnected';
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const data = await this.request<OllamaListResponse>('/tags', {}, 'GET');
            return data.models.map((m) => m.name);
        } catch (error) {
            logger.error('Failed to list models', error);
            return [];
        }
    }

    async generateChatCompletion(messages: ChatMessage[], model: string, options?: OllamaOptions): Promise<OllamaResponse> {
        const finalOptions = {
            ...options,
            keep_alive: options?.keep_alive ?? 300 // Default 5 minutes
        };

        return this.request<OllamaResponse>('/chat', {
            model,
            messages,
            options: finalOptions
        });
    }

    async streamChatCompletion(
        messages: ChatMessage[],
        model: string,
        options: OllamaOptions,
        onDelta: (delta: ChatMessageDelta) => void,
        abortController?: AbortController
    ): Promise<void> {
        try {
            // Add default keep_alive of 5 minutes (300 seconds)
            const finalOptions = {
                ...options,
                keep_alive: options.keep_alive ?? 300
            };

            const requestOptions: RequestInit = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    options: finalOptions,
                    stream: true
                }),
            };

            // Add signal to the request if abortController is provided
            if (abortController) {
                requestOptions.signal = abortController.signal;
            }

            const response = await fetch(`${this.apiUrl}/api/chat`, requestOptions);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const validatedChunk = OllamaStreamChunkSchema.parse(JSON.parse(line));
                        if (validatedChunk.message) {
                            onDelta({
                                content: validatedChunk.message.content,
                                done: validatedChunk.done
                            });
                        }
                    } catch (parseError) {
                        logger.error('Failed to parse chunk:', line, parseError);
                        continue;
                    }
                }
            }
        } catch (error) {
            logger.error('Stream error:', error);
            throw error;
        }
    }

    // async generateChatCompletionStream(
    //     messages: ChatMessage[],
    //     model: string,
    //     options: OllamaOptions
    // ): Promise<ReadableStream<string>> {
    //     const response = await fetch('http://localhost:11434/api/chat', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({
    //             model,
    //             messages,
    //             options,
    //             stream: true
    //         })
    //     });

    //     if (!response.ok || !response.body) {
    //         throw new Error('Failed to generate response');
    //     }

    //     return response.body.pipeThrough(new TextDecoderStream());
    // }
}

// Create a default instance
export const ollamaClient = new OllamaClient();
