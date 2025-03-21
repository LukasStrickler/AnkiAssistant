import { OutlineItem } from "@/components/dialogs/deck-creation/types";
import { Card } from "@/components/dialogs/deck-creation/types";
import { AddPromptData, InferencePromptStatus } from "@/stores/inference-store";
import { useNoteVariantStore } from "@/stores/note-variant-store";

export async function generateCard(
    outlineItem: OutlineItem,
    updateOutlineCard: (outlineItem: OutlineItem) => void,
    updateOutlineStatus: (outlineItem: OutlineItem) => void,
    addPrompt: (promptData: AddPromptData) => void,
    models: { contentModel?: string, overviewModel?: string, availableModels: string[] },
    priority: number = 0,
) {
    // Get the prompt hint from the note variant store
    const { variants } = useNoteVariantStore.getState();
    const variant = variants.find(v => v.id === outlineItem.card_type);
    const promptHint = variant?.promptHint ?? "Create a comprehensive card that effectively teaches the concept";

    let prompt = `
    IMPORTANT: CREATE EXACTLY ONE (1) CARD, NO MORE AND NO LESS.
    Even if the content is extensive, synthesize it into a single, comprehensive card.

    Card Type: ${outlineItem.card_type}
    Card Type Guidance: ${promptHint}

    Output format (JSON only, no additional text):
        {
            "front": "string",
            "back": "string"
        }
    You are tasked with creating ONE high-quality Anki flashcard following these principles:

    CARD CREATION RULES:
    1. Front (Question) Guidelines:
       - Create ONE focused question that tests understanding, not mere recall
       - Frame the question to require explanation or analysis
       - Use clear, unambiguous language
       - Include necessary context but avoid giving away the answer
       - Prefer formats like:
         • "Why does/how does...?"
         • "Explain the relationship between..."
         • "Compare and contrast..."
         • "What are the implications of...?"

    2. Back (Answer) Guidelines:
       - Structure the answer in a clear hierarchy
       - Start with a concise main point/definition
       - Follow with detailed explanation using bullet points
       - Include at least one concrete example or application
       - Use mnemonics or memorable associations when applicable
       - End with any important exceptions or edge cases

    3. Formatting Requirements:
       - Use Markdown and LaTeX formatting
       - For inline math: $x = y + z$
       - For block math: $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$
       - **Bold** for key terms (first occurrence only)
       - \`code blocks\` for syntax/technical terms
       - > for definitions or important quotes
       - Use nested bullets for hierarchical information:
         • Main point
           ◦ Sub-point
             ▪ Detail
       - All LaTeX must use double backslashes: \\\\ not \\

    4. Quality Standards:
       - Ensure the card follows the "minimum information principle"
       - Make the card self-contained but not overwhelming
       - Include all key points while maintaining clarity
       - Use active voice and direct language
       - Avoid ambiguity and vague terminology
       - Test understanding rather than memorization

    Topic to cover:
    ${outlineItem.concept}

    Key points to include:
    ${outlineItem.key_points}

    CRITICAL REQUIREMENTS:
    - Generate EXACTLY ONE card
    - Include ALL key points in this single card
    - Return ONLY the JSON object, no explanations
    - Ensure proper escaping of special characters
    - Verify LaTeX syntax is correct
    `

    // Log the prompt for debugging
    console.log('Generating card for concept:', outlineItem.concept);
    console.log('Card prompt:', prompt);

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
        console.log("Direct JSON parsing failed:", e);
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
        console.log("Regex extraction failed:", e);
    }

    // If both approaches fail, return the original result
    console.error("Failed to parse card with both approaches");
    console.log("result:", result);
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