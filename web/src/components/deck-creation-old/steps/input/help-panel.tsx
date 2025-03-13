"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function HelpPanel() {
    return (
        <div className="h-full flex flex-col">
            <div className="flex-grow">
                <h2 className="text-xl font-semibold mb-4">Content Preview</h2>
                <div className="text-muted-foreground mb-8">
                    Enter your notes and generate an outline to get started.
                </div>
            </div>

            <div className="border rounded-lg bg-card">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="formatting">
                        <AccordionTrigger className="px-4">
                            Markdown Formatting Tips
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Use <code className="bg-muted px-1 rounded">#</code> for headings (e.g., <code className="bg-muted px-1 rounded"># Section 1</code>)</li>
                                <li>• Create lists with <code className="bg-muted px-1 rounded">-</code> or <code className="bg-muted px-1 rounded">*</code></li>
                                <li>• Emphasize text with <code className="bg-muted px-1 rounded">*italic*</code> or <code className="bg-muted px-1 rounded">**bold**</code></li>
                                <li>• Add code with <code className="bg-muted px-1 rounded">`code`</code></li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="best-practices">
                        <AccordionTrigger className="px-4">
                            Best Practices for Good Cards
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Keep information atomic and focused</li>
                                <li>• Use clear and concise language</li>
                                <li>• Include relevant context</li>
                                <li>• Break complex topics into smaller pieces</li>
                                <li>• Use examples for abstract concepts</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="process">
                        <AccordionTrigger className="px-4">
                            Generation Process
                        </AccordionTrigger>
                        <AccordionContent className="px-4">
                            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                                <li>Content analysis and outline creation</li>
                                <li>Review and adjust the generated outline</li>
                                <li>Flashcard generation based on outline</li>
                                <li>Review and customize cards</li>
                                <li>Save to Anki</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
} 