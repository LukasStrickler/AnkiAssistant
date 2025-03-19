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
    Create a json object in the following format:
    {
        "front": "string",
        "back": "string"
    }

    The first model is the overview model, and the second model is the content model.
    You are the second model and are dumber than the first model, do exactly what the first model tells you.
    The front of the card should be a question and the back should be the answer.
    Do not give giant paragraphs, keep it short and concise.
    Use Markdown formatting for the front and back of the card.
    Use bullet points for the back of the card.

    The card should be about the following concept:
    ${outlineItem.concept}
    and the following key points:
    ${outlineItem.key_points}
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
        return JSON.parse(json_result[0]);
    }

    return result;

}

