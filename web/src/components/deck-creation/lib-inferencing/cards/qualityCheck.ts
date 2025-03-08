// Content -> content bad

import { Card } from "../../steps/types";

export function checkCardQuality(card: Card) {
    // check if the card is valid
    return card.front.length > 0 && card.back.length > 0;
}
