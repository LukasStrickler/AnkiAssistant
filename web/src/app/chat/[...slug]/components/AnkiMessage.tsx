import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useEffect, useState } from "react";
import { DeckList } from "@/components/anki/deck-list";
import { logger } from "@/lib/logger";
import { type AnkiCard, ankiClient } from "@/lib/anki";

export function AnkiMessage({ content }: { content: string }) {
    const [isOpen, setIsOpen] = useState<string[]>(["1"]);


    // Parse the deck name from content
    // const deckName = content.trim().split('\n')[0]?.trim().split(':')[1]?.trim() || 'Unknown Deck';
    // TOP DECK: 02 - Languages::01 - English

    // get first line of content
    let deckName = content.trim().split('\n')[0]?.trim();
    // remove "TOP DECK: " from deckName
    deckName = deckName?.replace('TOP DECK: ', '');

    if (!deckName) {
        return null;
    }

    if (deckName === 'Unknown Deck') {
        return null;
    }

    const [cards, setCards] = useState<AnkiCard[]>([]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadCards = async () => {
            try {
                // Pass abort signal to the stream
                const stream = ankiClient.streamDeckCards(deckName, 10, controller.signal);
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
    }, [deckName]);

    return (
        <div className="w-full">
            <Accordion
                type="multiple"
                className="p-0 m-0"
                value={isOpen}
                onValueChange={setIsOpen}
            >
                <AccordionItem value="0" className="border rounded-xl">
                    <AccordionTrigger className="flex items-center justify-between px-4 py-2 hover:no-underline group">
                        <h2 className="text-lg font-bold text-muted-foreground underline">{deckName}</h2>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 px-4">
                        <DeckList cards={cards} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}