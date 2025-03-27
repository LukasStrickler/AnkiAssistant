// fix content

import { type Card } from "@/components/dialogs/deck-creation/types";

export async function optimizeCard(card: Card) {

    //wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    return card;
}