"use client";

import { type AnkiCard, ankiClient } from "@/lib/anki";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { AllDecks } from "@/components/anki/all-decks";

export default function DeckChat({ currentDeck }: { currentDeck: string }) {
    const [cards, setCards] = useState<AnkiCard[]>([]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadCards = async () => {
            try {
                // Pass abort signal to the stream
                const stream = ankiClient.streamDeckCards(currentDeck, 10, controller.signal);
                for await (const batch of stream) {
                    if (!isMounted) return;

                    setCards(prev => {
                        // Merge new cards with existing, updating any that were placeholders
                        const merged = new Map(prev.map(c => [c.cardId, c]));
                        batch.forEach(newCard => merged.set(newCard.cardId, newCard));
                        return Array.from(merged.values());
                    });
                }
            } catch (error) {
                if (isMounted) logger.error('Card loading interrupted', error);
            }
        };

        void loadCards();
        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [currentDeck]);

    return (
        <div className="flex flex-row h-[calc(100vh-100px)] gap-4">
            <div className="flex-1 flex flex-col">
                <ScrollArea className="h-full">
                    <div className="pr-4">
                        {/* You can add card list implementation here */}
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </div>

            <Separator orientation="vertical" className="px-0.5 rounded-xl" />

            <div className="flex-1 flex flex-col">
                <ScrollArea className="h-full">
                    <AllDecks cards={cards} />
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </div>
        </div>
    );
}