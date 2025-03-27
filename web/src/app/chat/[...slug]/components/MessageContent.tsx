import React from "react";
import { BrainCircuit } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import Card from "./Card";
import Deck from "./Deck";

/**
 * MessageContent component that processes and renders message content
 * including special tags like <think>, @Card and @Deck
 */
export const MessageContent = ({ message, role }: { message: string, role: 'user' | 'assistant' }) => {
    // Only process <think> tags for assistant messages
    const isAssistant = role === 'assistant';

    // Check if the message contains complete think tags or starts with an opening tag
    const completeThinkMatch = isAssistant ? /<think>([\s\S]*?)<\/think>/.exec(message) : null;
    const hasOpeningTagOnly = isAssistant && !completeThinkMatch && message.includes('<think>');

    let thinkContent = '';
    let regularContent = message;
    let hasRealThinkContent = false;

    if (completeThinkMatch) {
        // Complete tag case - extract content between tags
        thinkContent = completeThinkMatch[1] ?? '';
        regularContent = message.replace(/<think>[\s\S]*?<\/think>/, '');
        hasRealThinkContent = !!thinkContent.trim();
    } else if (hasOpeningTagOnly) {
        // Streaming case - only opening tag exists
        const parts = message.split('<think>');
        if (parts.length > 1) {
            thinkContent = parts[1] ?? '';
            regularContent = parts[0] ?? '';
            hasRealThinkContent = !!thinkContent.trim();
        }
    }

    // Process content for @Card and @Deck tags
    const processParts = (content: string) => {
        const parts = content.split(/(@Card\(\d+\)|@Deck\([^\)]+\))/);
        return parts.map((part, index) => {
            const cardMatch = /@Card\((\d+)\)/.exec(part);
            const deckMatch = /@Deck\(([^)]+)\)/.exec(part);

            if (cardMatch?.[1]) {
                return <Card key={index} cardId={cardMatch[1]} />;
            }

            if (deckMatch?.[1]) {
                return <Deck key={index} deckName={deckMatch[1]} />;
            }

            return (
                <div className="markdown-content" key={index}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ ...props }) => <p className="whitespace-pre-line" {...props} />
                        }}
                    >
                        {part}
                    </ReactMarkdown>
                </div>
            );
        });
    };

    return (
        <span className="whitespace-normal break-words">
            {isAssistant && hasRealThinkContent && (
                <Accordion
                    type="single"
                    collapsible
                    className="mb-2 bg-primary-foreground/5 rounded-lg border border-primary/10 shadow-sm"
                >
                    <AccordionItem value="thinking" className="border-0">
                        <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:no-underline transition-all data-[state=open]:text-primary">
                            <div className="flex items-center gap-2">
                                <BrainCircuit className="h-4 w-4 text-primary" />
                                <span>Thinking Process</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 py-3 text-sm border-t border-primary/10 bg-primary-foreground/5">
                            <div className="font-normal text-foreground/90">
                                {processParts(thinkContent)}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
            {regularContent && <span>{processParts(regularContent)}</span>}
        </span>
    );
};

export default MessageContent; 