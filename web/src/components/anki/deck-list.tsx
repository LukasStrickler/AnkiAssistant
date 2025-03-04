import { type AnkiCard } from "@/lib/anki";
import { CardContent } from "./card-content";

export function DeckList({ cards }: { cards: AnkiCard[] }) {
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