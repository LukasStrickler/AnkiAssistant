import React, { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { MessageContent } from "./MessageContent";
import type { Message } from "@/local-db";

/**
 * AssistantMessage component that displays AI assistant messages with custom hover actions
 */
export const AssistantMessage = ({ message }: { message: Message }) => {
    const { toast } = useToast();
    const [isHovering, setIsHovering] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);
    const hoverContentRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleCopy = () => {
        void navigator.clipboard.writeText(message.content);
        toast({
            variant: "default",
            description: (
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>Copied to clipboard</span>
                </div>
            ),
        });
    };


    // Track element hover state using a more reliable approach with ref
    useEffect(() => {
        const messageElement = messageRef.current;
        const hoverElement = hoverContentRef.current;

        if (!messageElement || !hoverElement) return;

        let isHoveringMessage = false;
        let isHoveringCard = false;

        const checkHoverState = () => {
            if (isHoveringMessage || isHoveringCard) {
                setIsHovering(true);
                if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                }
            } else {
                if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                }
                hoverTimeoutRef.current = setTimeout(() => {
                    setIsHovering(false);
                    hoverTimeoutRef.current = null;
                }, 400);
            }
        };

        const onMessageEnter = () => {
            isHoveringMessage = true;
            checkHoverState();
        };

        const onMessageLeave = () => {
            isHoveringMessage = false;
            checkHoverState();
        };

        const onCardEnter = () => {
            isHoveringCard = true;
            checkHoverState();
        };

        const onCardLeave = () => {
            isHoveringCard = false;
            checkHoverState();
        };

        messageElement.addEventListener('mouseenter', onMessageEnter);
        messageElement.addEventListener('mouseleave', onMessageLeave);
        hoverElement.addEventListener('mouseenter', onCardEnter);
        hoverElement.addEventListener('mouseleave', onCardLeave);

        return () => {
            messageElement.removeEventListener('mouseenter', onMessageEnter);
            messageElement.removeEventListener('mouseleave', onMessageLeave);
            hoverElement.removeEventListener('mouseenter', onCardEnter);
            hoverElement.removeEventListener('mouseleave', onCardLeave);
        };
    }, []);


    // Handle clicks outside the hover content to dismiss it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isHovering &&
                hoverContentRef.current &&
                !hoverContentRef.current.contains(event.target as Node) &&
                messageRef.current &&
                !messageRef.current.contains(event.target as Node)) {
                setIsHovering(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isHovering]);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="flex gap-4 justify-start relative">
            <div
                ref={messageRef}
                className="p-2 rounded-xl bg-transparent shadow-none px-0 w-full max-w-[100%] break-words"
            >
                <MessageContent message={message.content} role='assistant' />

                <div
                    ref={hoverContentRef}
                    className={`absolute left-0 transform translate-y-[90%] -mt-[40px] min-w-full z-50 bg-background rounded-md shadow-md 
                    transition-all duration-300 ease-in-out ${isHovering ? 'opacity-100 translate-y-[90%]' : 'opacity-0 translate-y-full pointer-events-none'}`}
                >
                    <div className="flex flex-col w-full">
                        <div className="flex items-center justify-start h-8 gap-2 px-0 w-full">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCopy}
                                className="h-8 flex items-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <Copy className="h-4 w-4" />
                                <span>Copy response</span>
                            </Button>

                            <Separator orientation="vertical" className="h-4 mx-0.5 px-0.5 rounded-full" />

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Generated with</span>
                                <span className="font-medium">
                                    {message.modelUsed || 'Not specified'}
                                </span>
                            </div>

                            <Separator orientation="vertical" className="h-4 mx-0.5 px-0.5 rounded-full" />

                            <div className="flex items-center text-sm text-muted-foreground">
                                <span className="text-xs whitespace-nowrap">
                                    {message.createdAt?.toLocaleString('en-US', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'UTC'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssistantMessage; 