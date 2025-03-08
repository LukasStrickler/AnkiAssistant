// for outline item, generate cards

import { OutlineItem, Card } from "../../steps/types";

export function generateCard(outlineItem: OutlineItem): Card {
    // inference
    // check format


    const response = `
        {
            "front": "What is the capital of France?",
            "back": "Paris"
        }
    `;

    const card = JSON.parse(response);

    return card;
}

