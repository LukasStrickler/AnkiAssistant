"use client";

import { type AnkiCard, ankiClient } from "@/lib/anki";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useMemo, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { ArrowRightCircle } from "lucide-react";
import { useRouter } from "next/navigation";

function AllDecks({ cards }: { cards: AnkiCard[] }) {
    const router = useRouter();
    // Memoize deck calculation
    const decks = useMemo(() => {
        return cards.reduce((acc, card) => {
            acc[card.deckName] = [...(acc[card.deckName] ?? []), card];
            return acc;
        }, {} as Record<string, AnkiCard[]>);
    }, [cards]); // Only recalculate when cards change

    const [openItems, setOpenItems] = useState<string[]>([]);
    const deckCount = Object.keys(decks).length;

    useEffect(() => {
        // Get stable array of deck names
        const deckNames = Object.keys(decks);
        // Only update if there's an actual change
        if (JSON.stringify(deckNames) !== JSON.stringify(openItems)) {
            setOpenItems(deckNames);
        }
    }, [decks]); // Now using memoized decks

    const deckToPath = (deckFullName: string) => {
        return `/deck/${deckFullName.split('::').map(encodeURIComponent).join('/')}`;
    };

    return (
        <Accordion
            type="multiple"
            className="space-y-2 pr-1"
            value={openItems}
            onValueChange={setOpenItems}
        >
            {Object.entries(decks).map(([deckName, cards]) => (
                <AccordionItem key={deckName} value={deckName} className="border rounded-lg rounded-xl">
                    <AccordionTrigger className="flex items-center justify-between px-4 py-2 hover:no-underline group">
                        <h2 className="text-lg font-bold">{deckName}</h2>
                        <div className="flex items-center ml-auto mr-2">
                            {deckCount > 1 && (
                                <ArrowRightCircle
                                    className="h-5 w-5 transition-opacity duration-200 opacity-0 group-hover:opacity-100 cursor-pointer text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(deckToPath(deckName));
                                    }}
                                />
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 px-2">
                        <DeckList cards={cards} />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

function DeckList({ cards }: { cards: AnkiCard[] }) {
    return <div className="flex flex-col gap-2">
        {cards.map((card) => (
            <CardContent key={card.cardId} card={card} />
        ))}
    </div>
}

function CardContent({ card }: { card: AnkiCard }) {
    const frontRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (frontRef.current) {
            renderMathInElement(frontRef.current, {
                delimiters: [
                    { left: "\\(", right: "\\)", display: false },
                    { left: "$$", right: "$$", display: true },
                    { left: "\\[", right: "\\]", display: true }
                ]
            });
        }
        if (backRef.current) {
            renderMathInElement(backRef.current, {
                delimiters: [
                    { left: "\\(", right: "\\)", display: false },
                    { left: "$$", right: "$$", display: true },
                    { left: "\\[", right: "\\]", display: true }
                ]
            });
        }
    }, [card]);

    return <div className="p-4 border rounded-lg rounded-xl">
        <div ref={frontRef} dangerouslySetInnerHTML={{ __html: card.fields.Front.value }} />
        <Separator orientation="horizontal" className="my-1" />
        <div ref={backRef} dangerouslySetInnerHTML={{ __html: card.fields.Back.value }} />
    </div>
}

export default function DeckChat({ currentDeck }: { currentDeck: string }) {
    const [cards, setCards] = useState<AnkiCard[]>([]);

    useEffect(() => {
        void ankiClient.getDeckCards(currentDeck).then(setCards);
    }, [currentDeck]);

    return <div className="flex flex-row h-[calc(100vh-100px)] gap-4">
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
}