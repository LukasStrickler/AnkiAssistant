// Import the OutlineItem type
import { OutlineItem } from '@/components/deck-creation/steps';
import { OllamaClient, ChatMessage } from '@/lib/ollama';

type OutlineGenerationResult = {
    result: OutlineItem[];
    ItemsWithMissingJsonFields: any[];
}

export type StreamCallback = (update: OutlineGenerationResult) => void;

export async function generateOutline(
    model: string,
    prompt: string,
    onStreamUpdate?: StreamCallback
): Promise<OutlineGenerationResult> {
    console.log("prompt", prompt);
    console.log("model", model);

    // just wait 1s then return pre-defined outline
    await new Promise(resolve => setTimeout(resolve, 1000));

    const returnValue = {
        result:
            [
                {
                    "id": 1,
                    "concept": "Introduction",
                    "key_points": "Covers basics of quantum computing concepts including qubits, superposition, and entanglement.",
                    "deck": "Uni::Sem 5::Economics::Basics",
                    "card_type": "Q&A",
                    "status": "outline-review"
                },
                {
                    "id": 2,
                    "concept": "Basics",
                    "key_points": "Provides an overview and fundamental concepts of quantum computing.",
                    "deck": "Uni::Sem 5::Economics::Basics",
                    "card_type": "Definition",
                    "status": "outline-review"
                },
                {
                    "id": 3,
                    "concept": "Quantum Computing Basics",
                    "key_points": "Explains key topics like qubits, superposition, entanglement, and their roles in quantum computing.",
                    "deck": "Uni::Sem 5::Economics::Basics",
                    "card_type": "Definition",
                    "status": "outline-review"
                },
                {
                    "id": 4,
                    "concept": "Qubits and Superposition",
                    "key_points": "Details about qubit states existing simultaneously due to superposition.",
                    "deck": "Uni::Sem 5::Economics::Basics",
                    "card_type": "Definition",
                    "status": "outline-review"
                },
                {
                    "id": 5,
                    "concept": "Entanglement and Parallelism",
                    "key_points": "Explains how entanglement links qubit states for parallel processing optimization.",
                    "deck": "Uni::Sem 5::Economics::Basics",
                    "card_type": "Definition",
                    "status": "outline-review"
                }
            ],
        ItemsWithMissingJsonFields: []
    }

    if (onStreamUpdate) {
        onStreamUpdate(returnValue);
    }

    return returnValue;

    // Initialize Ollama client
    const ollama = new OllamaClient();

    return new Promise((resolve) => {
        let currentContent = '';
        let result: OutlineGenerationResult = {
            result: [],
            ItemsWithMissingJsonFields: []
        };

        // Format messages for the Ollama API
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: 'You are an AI assistant that helps create Anki cards. Generate a JSON array of objects representing an outline for a deck. Each object should have "concept", "key_points", "deck", and "card_type" fields.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        // Our token update callback for streaming
        const handleDelta = (delta: { content: string, done?: boolean }) => {
            console.log('Received token:', delta.content);
            currentContent += delta.content;

            // Process partial content to extract any complete objects
            const partialResult = parsePartialOutline(currentContent);

            // Update our result state
            result = partialResult;

            // If callback provided, send the update
            if (onStreamUpdate) {
                onStreamUpdate(result);
            }

            // Resolve when done
            if (delta.done) {
                console.log('Stream completed. Final content:', currentContent);
                resolve(result);
            }
        };

        // Stream chat completion from Ollama
        ollama.streamChatCompletion(
            messages,
            model,
            { temperature: 0.7 },  // Moderate temperature for creative but coherent output
            handleDelta
        ).catch(error => {
            console.error("Error streaming from Ollama:", error);
            // If there's an error, resolve with what we have so far or an empty result
            resolve(result);
        });
    });
}

// Required fields for a valid outline item
const REQUIRED_FIELDS = ['concept', 'key_points', 'deck', 'card_type'] as const;
type RequiredField = typeof REQUIRED_FIELDS[number];

/**
 * Creates a valid OutlineItem from an object with the required fields
 */
function createOutlineItem(obj: Record<string, any>, index: number): OutlineItem {
    return {
        id: index + 1,
        concept: obj.concept,
        key_points: obj.key_points,
        deck: obj.deck,
        card_type: obj.card_type,
        status: "outline-review"
    };
}

/**
 * Extracts field values from text using regex when JSON parsing fails
 */
function extractFieldValuesWithRegex(text: string): Record<RequiredField, string> {
    const extractField = (field: RequiredField): string => {
        const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i');
        const match = text.match(regex);
        return match?.[1] ?? "";
    };

    return {
        concept: extractField('concept'),
        key_points: extractField('key_points'),
        deck: extractField('deck'),
        card_type: extractField('card_type')
    };
}

/**
 * Checks if an object has all the required fields with values
 */
function hasAllRequiredFields(obj: Record<string, any>): boolean {
    return REQUIRED_FIELDS.every(field =>
        field in obj && obj[field] !== undefined && obj[field] !== ''
    );
}

/**
 * Cleans JSON text to make it more likely to parse successfully
 */
function cleanJsonText(text: string): string {
    // Remove trailing commas before closing bracket
    return text.replace(/,\s*}/g, '}');
}

/**
 * Parse a potentially incomplete JSON string into OutlineItems
 * Handles partial JSON and text before/after the JSON
 */
export function parsePartialOutline(content: string): OutlineGenerationResult {
    const result: OutlineGenerationResult = {
        result: [],
        ItemsWithMissingJsonFields: []
    };

    // Early return for empty content
    if (!content || content.trim() === '') {
        return result;
    }

    // Check if content contains <think> tags
    const thinkTagStart = '<think>';
    const thinkTagEnd = '</think>';
    const thinkTagStartIndex = content.indexOf(thinkTagStart);
    const thinkTagEndIndex = content.indexOf(thinkTagEnd);

    // remove all content before </think>
    const contentAfterThinkTag = content.substring(thinkTagEndIndex);

    // has start but no end means that the content is a thinking output --> overwrite content with empty string
    if (thinkTagStartIndex !== -1 && thinkTagEndIndex === -1) {
        content = ""
    } // has start and end, return content after think tag
    else if (thinkTagStartIndex !== -1 && thinkTagEndIndex !== -1) {
        content = contentAfterThinkTag;
    }

    try {
        // Find array start
        const arrayStartIdx = content.indexOf('[');
        if (arrayStartIdx === -1) return result;

        // Extract content from the array start to the end
        const arrayContent = content.substring(arrayStartIdx);

        // Extract all JSON-like objects
        const objectTexts = extractJsonObjects(arrayContent);

        // Process each object text
        objectTexts.forEach((objectText, index) => {
            processObjectText(objectText, index, result);
        });
    } catch (e) {
        console.error("Error parsing outline:", e);
    }

    return result;
}

/**
 * Extracts all JSON-like objects from a string
 */
function extractJsonObjects(text: string): string[] {
    const objectTexts: string[] = [];
    const itemPattern = /{[\s\S]*?}/g;
    let match;

    while ((match = itemPattern.exec(text)) !== null) {
        objectTexts.push(match[0]);
    }

    return objectTexts;
}

/**
 * Processes a JSON-like object text and adds result to the appropriate array
 */
function processObjectText(
    objectText: string,
    index: number,
    result: OutlineGenerationResult
): void {
    // First try standard JSON parsing
    try {
        const cleanedText = cleanJsonText(objectText);
        const parsedObject = JSON.parse(cleanedText);

        if (hasAllRequiredFields(parsedObject)) {
            // Valid complete item
            result.result.push(createOutlineItem(parsedObject, index));
        } else {
            // Has some fields but not all
            result.ItemsWithMissingJsonFields.push(parsedObject);
        }
        return; // RETURN IF SUCCESSFULLY PARSED
    } catch (e) {
        // JSON parsing failed, try regex approach
    }

    // Check if text contains all required field names
    const hasAllFieldNames = REQUIRED_FIELDS.every(field =>
        objectText.includes(`"${field}"`)
    );

    if (hasAllFieldNames) {
        // Try to extract values with regex
        const extractedFields = extractFieldValuesWithRegex(objectText);

        if (hasAllRequiredFields(extractedFields)) {
            result.result.push(createOutlineItem(extractedFields, index));
        } else {
            result.ItemsWithMissingJsonFields.push({ partial: objectText });
        }
    } else {
        // Just a partial object without all field names
        result.ItemsWithMissingJsonFields.push({ partial: objectText });
    }
}
