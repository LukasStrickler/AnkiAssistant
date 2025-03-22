import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Plus, Loader2, FileIcon, BookOpen, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EnhancedChatInputProps {
    inputText: string;
    setInputText: React.Dispatch<React.SetStateAction<string>>;
    isSubmitting: boolean;
    onSendMessage: () => Promise<void>;
}

export const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
    inputText,
    setInputText,
    isSubmitting,
    onSendMessage,
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    // Toggle expanded options
    const toggleOptions = () => {
        setShowOptions(prev => !prev);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void onSendMessage();
        }
    };

    // Calculate character count color based on length
    const getCharCountColor = () => {
        // Just visual feedback - no actual limit
        if (inputText.length > 3000) return "text-amber-500";
        return "text-muted-foreground/70";
    };


    // Auto-grow textarea with controlled height
    useEffect(() => {
        if (textareaRef.current) {
            if (inputText.length === 0) {
                // Reset to exact single line height when empty
                textareaRef.current.style.height = '48px';
                return;
            }

            // Store current height before any changes
            const currentHeight = textareaRef.current.offsetHeight;

            // Check if content needs more space (temporarily set to auto)
            const originalHeight = textareaRef.current.style.height;
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;

            // Immediately restore height to prevent flicker
            textareaRef.current.style.height = originalHeight;

            // Only change height if content actually needs more space
            if (scrollHeight > currentHeight + 5) {
                // Calculate maximum height (10 rows)
                const lineHeight = 20;
                const maxHeight = lineHeight * 10;

                if (scrollHeight <= maxHeight) {
                    // Content fits within max height
                    requestAnimationFrame(() => {
                        textareaRef.current!.style.height = `${scrollHeight}px`;
                    });
                } else {
                    // Content exceeds max height, enable scrolling
                    requestAnimationFrame(() => {
                        textareaRef.current!.style.height = `${maxHeight}px`;
                    });
                    textareaRef.current.classList.remove('overflow-hidden');
                    textareaRef.current.classList.add('overflow-y-auto');
                }
            }
        }
    }, [inputText]);

    return (
        <div className="flex flex-col w-full">
            {/* Main input container with more prominent border */}
            <div
                className={cn(
                    "relative rounded-xl border-2 bg-background/90 backdrop-blur-sm transition-all duration-300",
                    "shadow-sm dark:shadow-inner dark:shadow-accent/5",
                    isFocused
                        ? "border-primary/70 shadow-md ring-1 ring-primary/20"
                        : "border-input/50 hover:border-input"
                )}
            >
                {/* Single-line text input area */}
                <div className="relative px-4 py-1">
                    <style jsx global>{`
                        /* Custom scrollbar styles */
                        textarea::-webkit-scrollbar {
                            width: 8px;
                            background-color: transparent;
                        }
                        
                        textarea::-webkit-scrollbar-thumb {
                            background-color: hsla(var(--primary) / 0.2);
                            border-radius: 4px;
                        }
                        
                        textarea::-webkit-scrollbar-thumb:hover {
                            background-color: hsla(var(--primary) / 0.3);
                        }
                        
                        /* Firefox */
                        textarea {
                            scrollbar-width: thin;
                            scrollbar-color: hsla(var(--primary) / 0.2) transparent;
                        }
                    `}</style>
                    <Textarea
                        ref={textareaRef}
                        placeholder={isFocused ? "What would you like to ask?" : "Type a message..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={cn(
                            "h-[48px] min-h-0 w-full resize-none overflow-hidden",
                            "border-0 bg-transparent px-0 py-1 shadow-none outline-none",
                            "focus:outline-none focus:ring-0 focus-visible:ring-0",
                            "text-base leading-[24px] placeholder:text-muted-foreground/50",
                            isSubmitting && "opacity-70"
                        )}
                    />
                </div>

                {/* Bottom toolbar */}
                <div className="flex items-center justify-between px-4 py-1 border-t border-border/30">
                    {/* Left side - action buttons */}
                    <div className="flex items-center gap-1.5">
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                        onClick={toggleOptions}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Add reference</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Conditionally show expanded options */}
                        <AnimatePresence>
                            {showOptions && (
                                <>
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "auto", opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                                    >
                                                        <FileIcon className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Add attachment</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </motion.div>

                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "auto", opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                                    >
                                                        <BookOpen className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Add deck reference</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </motion.div>

                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: "auto", opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                                    >
                                                        <CreditCard className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Add card reference</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right side - character count and send button */}
                    <div className="flex items-center gap-2">
                        {/* Character count indicator (only shows the count, no limit) */}
                        {inputText.length > 0 && (
                            <div className={cn(
                                "text-xs font-medium transition-colors",
                                getCharCountColor()
                            )}>
                                {inputText.length} chars
                            </div>
                        )}

                        {/* Send button */}
                        <Button
                            size="sm"
                            type="submit"
                            disabled={isSubmitting || !inputText.trim()}
                            className={cn(
                                "h-8 px-3 transition-all rounded-full",
                                inputText.trim()
                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                            onClick={() => void onSendMessage()}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <span className="mr-1">Send</span>
                                    <Send className="h-3.5 w-3.5" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedChatInput; 