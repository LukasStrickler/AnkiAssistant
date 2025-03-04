"use client"
// Chat page with organized components

import { Suspense } from "react"
import ChatContent from "./components/ChatContent"

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <ChatContent />
        </Suspense>
    );
} 