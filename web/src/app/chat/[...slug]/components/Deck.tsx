import React from "react";
import { Book } from "lucide-react"; // Assuming Book icon is used for decks

/**
 * Deck component that displays a deck name with styling and a small icon before
 */
export const Deck = ({ deckName }: { deckName: string }) => {
    return (
        <>
            <span className="inline-flex items-center p-0.5 rounded-md bg-accent underline text-foreground">
                <Book className="h-4 w-4 mr-2" />
                {deckName}
            </span>
        </>
    );
};

export default Deck; 