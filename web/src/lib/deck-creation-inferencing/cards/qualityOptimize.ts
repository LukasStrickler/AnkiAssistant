// fix content

import { Card } from "@/components/deck-creation-old/steps/types";

export async function optimizeCard(card: Card) {

    //wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    return card;
}