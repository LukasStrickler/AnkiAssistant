"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    InfoIcon,
    FileTextIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ListTodoIcon,
} from "lucide-react";

interface TipProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

function Tip({ icon, title, children }: TipProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="text-primary">{icon}</div>
                <span className="font-medium">{title}</span>
            </div>
            <div className="text-muted-foreground text-[15px] leading-relaxed pl-7">
                {children}
            </div>
        </div>
    );
}

export function InputHelp() {
    return (
        <div className="h-[calc(100%-2rem)] mt-7">
            <Card className="flex flex-col h-full">
                <CardHeader className="pb-4 space-y-1.5">
                    <p className="text-muted-foreground text-[15px]">
                        Follow these tips to create effective flashcard decks from your notes.
                    </p>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full -mr-6 pr-6">
                        <div className="space-y-6">
                            <Tip icon={<FileTextIcon className="h-5 w-5" />} title="Markdown Support">
                                Your notes should be in Markdown format. Headers (##, ###) help organize content
                                and create natural card divisions.
                            </Tip>

                            <Tip icon={<InfoIcon className="h-5 w-5" />} title="Optimal Content Length">
                                Keep individual sections focused and concise. Very long blocks of text might be
                                split into multiple cards for better learning.
                            </Tip>

                            <Tip icon={<ListTodoIcon className="h-5 w-5" />} title="Structure Tips">
                                Use bullet points and numbered lists for clear, structured information. Include
                                examples and key terms in your notes.
                            </Tip>

                            <Tip icon={<CheckCircleIcon className="h-5 w-5" />} title="Best Practices">
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Start with headers for main topics
                                    </li>
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Use bullet points for key facts
                                    </li>
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Include relevant examples
                                    </li>
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Break complex topics into smaller chunks
                                    </li>
                                </ul>
                            </Tip>

                            <Tip icon={<AlertTriangleIcon className="h-5 w-5" />} title="Common Pitfalls">
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Avoid extremely long paragraphs
                                    </li>
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Don&apos;t include unnecessary formatting
                                    </li>
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Skip irrelevant metadata or references
                                    </li>
                                    <li className="flex items-center gap-2 text-foreground/80">
                                        <span className="text-primary">•</span>
                                        Remove duplicate information
                                    </li>
                                </ul>
                            </Tip>

                            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="p-6 space-y-4">
                                    <h4 className="font-medium leading-none">Example Format</h4>
                                    <pre className="text-[15px] text-muted-foreground font-mono whitespace-pre-wrap rounded-md bg-muted/50 p-4">
                                        {`## Topic Title

Key concept explanation here...

### Subtopic

- Important point 1
- Important point 2

### Examples

1. First example
2. Second example`}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
