import { type OutlineItem } from "@/components/dialogs/deck-creation/types";
import { type Card } from "@/components/dialogs/deck-creation/types";
import { type AddPromptData, type InferencePromptStatus } from "@/stores/inference-store";
import { useNoteVariantStore } from "@/stores/note-variant-store";
import { logger } from "better-auth";
export async function generateCard(
    outlineItem: OutlineItem,
    updateOutlineCard: (outlineItem: OutlineItem) => void,
    updateOutlineStatus: (outlineItem: OutlineItem) => void,
    addPrompt: (promptData: AddPromptData) => void,
    models: { contentModel?: string, overviewModel?: string, availableModels: string[] },
    priority = 0,
) {
    // Get the prompt hint from the note variant store
    const { variants } = useNoteVariantStore.getState();
    const variant = variants.find(v => v.id === outlineItem.card_type);
    const promptHint = variant?.promptHint ?? "Create a comprehensive card that effectively teaches the concept";

    const prompt = `
    You are the second model in the pipeline, tasked with creating ONE concise Anki flashcard from the provided outline.
    Focus on the key information provided - do not add unnecessary details or examples.

    Card Type: ${outlineItem.card_type}
    Card Type Guidance: ${promptHint}

    Output format (JSON only, no additional text):
        {
            "front": "string",
            "back": "string"
        }

    CARD CREATION RULES:
    1. Front (Question) Guidelines:
       - Create a single, focused question
       - Use the exact terminology from the outline
       - Keep questions short and direct
       - Avoid complex scenarios or lengthy context

    2. Back (Answer) Guidelines:
       - Use the key points directly from the outline
       - Present information in a simple list or short paragraphs
       - Avoid adding extra examples or explanations
       - Keep the answer concise and to the point
       - Use markdown formatting (if you want a line break, use \\n)

    3. Formatting Requirements:
       - Use minimal formatting
       - For math: $x = y + z$ or $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$
       - Use **bold** only for key terms
       - Use simple bullet points when needed
       - All LaTeX must use double backslashes: \\\\ not \\

    4. Quality Standards:
       - Stick to the information provided in the outline
       - Keep cards short and focused
       - Avoid adding extra context or examples
       - Use clear, direct language
       - Test core understanding without complexity

    Content to transform:
    Topic: ${outlineItem.concept}
    Key points: ${outlineItem.key_points}

    CRITICAL REQUIREMENTS:
    - Generate EXACTLY ONE card - no more, no less
    - Use ONLY the information from the outline
    - Keep the card short and focused
    - Return ONLY the JSON object, no additional text
    - Ensure proper escaping of special characters
    - Verify LaTeX syntax is correct
    - Follow the card type's example format exactly
    `

    // Log the prompt for debugging
    logger.info('Generating card for concept:', outlineItem.concept);
    logger.info('Card prompt:', prompt);

    // Use the passed models
    const selectedModel = models.contentModel ?? models.overviewModel ?? models.availableModels[0] ?? "";

    let fullPrompt: AddPromptData = {
        creator: "deck-creation",
        prompt: prompt,
        model: selectedModel,
        priority: priority,
        finishFn: (result) => {
            // here we set the card to the outline item

            // check if it contains the front and back in json format

            /*
            {
                "front": "string",
                "back": "string"
            }
            */


            // parse the result
            const card = parseCardResult(result);
            if (typeof card === "string") {
                // if it is a string, it means there was an error
                // so we set the card to the outline item
                updateOutlineCard({
                    ...outlineItem,
                    card: {
                        front: card,
                        back: "PLEASE TRY FIXING THE CARD MANUALLY"
                    }
                });

            } else {
                // if it is a card, we set the card to the outline item
                updateOutlineCard({
                    ...outlineItem,
                    card: card
                });
            }
        },
        updateStatusFn: (status: InferencePromptStatus) => {

            if (status === "pending") {
                updateOutlineStatus({
                    ...outlineItem,
                    status: "pending"
                });
            } else if (status === "in-progress") {
                updateOutlineStatus({
                    ...outlineItem,
                    status: "generating"
                });
            } else if (status === "completed") {
                updateOutlineStatus({
                    ...outlineItem,
                    status: "card-review"
                });
            } else if (status === "error") {
                updateOutlineStatus({
                    ...outlineItem,
                    status: "error"
                });
            }
            // here we update the status of the outline item
        }
    }

    addPrompt(fullPrompt);


}

export function parseCardResult(result: string): Card | string {
    // Remove think tags if present
    if (result.includes("<think>")) {
        result = result.substring(result.indexOf("</think>") + 7);
    }

    // Approach 1: Try direct JSON parsing with cleaned input
    try {
        // Clean the input by removing newlines and extra whitespace
        const cleanedResult = result.replace(/\n\s*/g, '\n').trim();
        const json_result = cleanedResult.match(/{([\s\S]*?)}/);
        if (json_result) {
            const parsedCard = JSON.parse(json_result[0]);
            if (isValidCard(parsedCard)) {
                return parsedCard;
            }
        }
    } catch (e) {
        logger.error("Direct JSON parsing failed:", e);
    }

    // Approach 2: Try regex extraction with improved pattern
    try {
        const frontMatch = result.match(/"front"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/);
        const backMatch = result.match(/"back"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/);

        if (frontMatch && backMatch) {
            const card = {
                front: frontMatch[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\/g, '').trim() ?? '',
                back: backMatch[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\/g, '').trim() ?? ''
            };
            if (isValidCard(card)) {
                return card;
            }
        }
    } catch (e) {
        logger.error("Regex extraction failed:", e);
    }

    // If both approaches fail, return the original result
    logger.error("Failed to parse card with both approaches");
    logger.error("result:", result);
    return result;
}

// Helper function to validate card structure
function isValidCard(card: any): card is Card {
    return (
        card &&
        typeof card === 'object' &&
        typeof card.front === 'string' &&
        typeof card.back === 'string' &&
        card.front.trim() !== '' &&
        card.back.trim() !== ''
    );
}

function processMarkdownAndLatex(content: string): string {
    // Replace LaTeX delimiters with Anki-compatible format
    content = content
        // Inline math: $...$ -> \\(...\\)
        .replace(/\$([^$]+)\$/g, '\\\\($1\\\\)')
        // Block math: $$...$$ -> \\[...\\]
        .replace(/\$\$([^$]+)\$\$/g, '\\\\[$1\\\\]');

    // TODO: Add markdown-it or other markdown processor here
    // For now, return the content with LaTeX processed
    return content;
}