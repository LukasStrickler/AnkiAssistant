import React from "react";
import { MessageContent } from "./MessageContent";
import type { Message } from "@/local-db";

/**
 * UserMessage component that displays user messages with formatting and timestamp
 */
export const UserMessage = ({ message }: { message: Message }) => {
    return (
        <div className="flex gap-4 justify-end">
            <div className="p-4 rounded-xl bg-primary text-primary-foreground ml-auto max-w-[90%] w-full break-words">
                <MessageContent message={message.content} role='user' />
                <p className="text-xs mt-2 opacity-70">
                    {message.createdAt?.toLocaleString('en-US', {
                        year: 'numeric',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC'
                    })}
                </p>
            </div>
        </div>
    );
};

export default UserMessage; 