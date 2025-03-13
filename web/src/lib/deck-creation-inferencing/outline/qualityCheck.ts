// check if the outline is valid

import { OutlineItem } from "@/components/deck-creation-old/steps/types";

export async function checkOutlineQuality(outline: OutlineItem[], model: string, prompt: string) {

    // mock 3s delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    return outline.length > 0;
}