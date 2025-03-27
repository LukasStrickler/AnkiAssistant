// Content -> content bad

import { type Card } from "@/components/dialogs/deck-creation/types";

export function checkCardQuality(card: Card) {
    // check if the card is valid
    return card.front.length > 0 && card.back.length > 0;
}
