import React from "react";

/**
 * Card component that displays a card ID with styling
 */
export const Card = ({ cardId }: { cardId: string }) => {
    return (
        <>
            <span> </span>
            <span className="inline-flex items-center p-0.5 rounded-md bg-accent text-foreground">
                {cardId}
            </span>
        </>
    );
};

export default Card; 