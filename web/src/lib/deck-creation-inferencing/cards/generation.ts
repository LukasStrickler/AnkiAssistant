// for outline item, generate cards

import { OutlineItem, Card } from "@/components/deck-creation-old/steps/types";

export async function generateCard(outlineItem: OutlineItem): Promise<Card> {
    // inference
    // check format
    // await 500ms
    await new Promise(resolve => setTimeout(resolve, 5000));

    const response = `
        {
            "front": "What is the capital of France?",
            "back": "Paris"
        }
    `;

    const card = JSON.parse(response);

    return card;
}

