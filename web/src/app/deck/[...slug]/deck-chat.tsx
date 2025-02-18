"use client";

import { type AnkiCard, ankiClient } from "@/lib/anki";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useMemo, useRef, useDeferredValue } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { ArrowRightCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

function AllDecks({ cards }: { cards: AnkiCard[] }) {
    const router = useRouter();
    const [openItems, setOpenItems] = useState<number[]>(Array.from({ length: 100 }, (_, i) => i));
    const [userModified, setUserModified] = useState(false);

    const { decks, deckNames } = useMemo(() => {
        const deckMap = cards.reduce((acc, card) => {
            acc[card.deckName] = [...(acc[card.deckName] ?? []), card];
            return acc;
        }, {} as Record<string, AnkiCard[]>);
        return {
            decks: deckMap,
            deckNames: Object.keys(deckMap)
        };
    }, [cards]);

    // Initialize open items with deck names on first load
    useEffect(() => {
        if (deckNames.length > 0 && openItems.length === 0) {
            setOpenItems(deckNames.map(name => deckNames.indexOf(name)));
        }
    }, [deckNames]); // Only run when deckNames changes

    const handleAccordionChange = (value: string[]) => {
        if (!userModified) setUserModified(true);
        setOpenItems(value.map(v => parseInt(v)));
    };

    const deckToPath = (deckFullName: string) => {
        return `/deck/${deckFullName.split('::').map(encodeURIComponent).join('/')}`;
    };

    return (
        <Accordion
            type="multiple"
            className="space-y-2 pr-1"
            value={openItems.map(String)}
            onValueChange={handleAccordionChange}
        >
            {deckNames.map((deckName, index) => (
                <AccordionItem key={deckName} value={String(index)} className="border rounded-xl">
                    <AccordionTrigger className="flex items-center justify-between px-4 py-2 hover:no-underline group">
                        <h2 className="text-lg font-bold">{deckName} <span className="text-muted-foreground text-sm">({decks[deckName]?.length})</span></h2>
                        <div className="flex items-center ml-auto mr-2">
                            {deckNames.length > 1 && (
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
                        <DeckList cards={decks[deckName] ?? []} />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

function DeckList({ cards }: { cards: AnkiCard[] }) {
    return (
        <div className="flex flex-col gap-2">
            {cards.map((card) => (
                <div key={card.cardId} className="card-streaming">
                    <CardContent card={card} />
                </div>
            ))}
        </div>
    );
}

function CardContent({ card }: { card: AnkiCard }) {
    const frontRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Add constant for shared render config
    const katexConfig = {
        delimiters: [
            { left: "\\(", right: "\\)", display: false },
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true }
        ]
    };

    // Add fade-in transition when content loads
    useEffect(() => {
        if (card.fields.Front.value && card.fields.Back.value) {
            setIsLoaded(true);
        }
    }, [card]);

    // Skeleton loader component
    const FieldSkeleton = () => (
        <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
    );

    useEffect(() => {
        // Combine into single effect with cleanup
        const front = frontRef.current;
        const back = backRef.current;

        if (front) renderMathInElement(front, katexConfig);
        if (back) renderMathInElement(back, katexConfig);

        return () => {
            if (front) front.querySelectorAll('.katex').forEach(el => el.remove());
            if (back) back.querySelectorAll('.katex').forEach(el => el.remove());
        };
    }, [card.fields.Front.value, card.fields.Back.value, katexConfig]);

    return <div className={`p-4 border rounded-lg rounded-xl transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <div ref={frontRef} className="[&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
            {card.fields.Front.value ?
                <div dangerouslySetInnerHTML={{ __html: card.fields.Front.value }} /> :
                <FieldSkeleton />
            }
        </div>
        <Separator orientation="horizontal" className="my-1" />
        <div ref={backRef} className="[&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
            {card.fields.Back.value ?
                <div dangerouslySetInnerHTML={{ __html: card.fields.Back.value }} /> :
                <FieldSkeleton />
            }
        </div>
    </div>
}

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