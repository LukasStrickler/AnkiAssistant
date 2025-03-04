import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";
import { type AnkiCard } from "@/lib/anki";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DeckList } from "./deck-list";

export function deckToPath(deckName: string) {
    return `/deck/${encodeURIComponent(deckName)}`;
}

export function AllDecks({ cards }: { cards: AnkiCard[] }) {
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