import { OutlineItem } from "@/components/dialogs/deck-creation/types";
import { Card } from "@/components/dialogs/deck-creation/types";
import { AddPromptData, InferencePromptStatus } from "@/stores/inference-store";

export async function generateCard(
    outlineItem: OutlineItem,
    updateOutlineCard: (outlineItem: OutlineItem) => void,
    updateOutlineStatus: (outlineItem: OutlineItem) => void,
    addPrompt: (promptData: AddPromptData) => void,
    models: { contentModel?: string, overviewModel?: string, availableModels: string[] },
    priority: number = 0,
) {
    // Instead of using hooks, we receive the needed values as parameters

    let prompt = `
    IMPORTANT: CREATE EXACTLY ONE (1) CARD, NO MORE AND NO LESS.
    Even if the content is extensive, synthesize it into a single, comprehensive card.

    Create a json object in the following format:
    {
        "front": "string",
        "back": "string"
    }

    You are tasked with creating ONE high-quality Anki flashcard following these principles:

    CARD CREATION RULES:
    1. Front (Question) Guidelines:
       - Create ONE focused question that covers the main concept
       - The question should be broad enough to encompass the key points
       - Use clear, unambiguous language
       - Include enough context to make the question meaningful
       - Prefer "why/how" questions that allow comprehensive answers

    2. Back (Answer) Guidelines:
       - Include all relevant key points in a structured manner
       - Use bullet points to organize multiple pieces of information
       - Keep the structure clear even with more content
       - Use sub-bullets if needed to organize related information
       - Include examples when they clarify the concept

    3. Formatting Requirements:
       - Use Markdown and LaTeX formatting
       - For inline math, use single $ (e.g., $x = y + z$)
       - For block math, use double $$ (e.g., $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$)
       - Use **bold** for emphasis on key terms
       - Use \`code blocks\` for technical terms or syntax
       - Use bullet points (•) for lists
       - Use > for important quotes or definitions
       - Use nested bullets (indentation) for hierarchical information
       - LaTeX commands must be properly escaped (use \\\\ instead of \\)

    4. Quality Standards:
       - Create ONE comprehensive card that covers the concept
       - Ensure all key points are included in this single card
       - Make the answer thorough but organized
       - Use precise language
       - Structure complex information clearly
       - Ensure all LaTeX expressions are properly formatted

    Create ONE card about this concept:
    ${outlineItem.concept}

    Include these key points in the SAME card:
    ${outlineItem.key_points}

    Remember:
    - Create EXACTLY ONE card
    - Include ALL key points in this single card
    - Structure the information clearly if extensive
    - Use proper markdown and LaTeX formatting
    - Escape LaTeX commands properly
    `

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


function parseCardResult(result: string): Card | string {
    // check if has think tags
    if (result.includes("<think>")) {
        // remove all content before </think>
        result = result.substring(result.indexOf("</think>") + 7);
    }

    const json_result = result.match(/{([\s\S]*?)}/);
    console.log("json_result", json_result);

    if (json_result) {
        try {
            return JSON.parse(json_result[0]);
        } catch (e) {
            console.error("Failed to parse card:", e);
            return result;
        }
    }

    return result;
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

