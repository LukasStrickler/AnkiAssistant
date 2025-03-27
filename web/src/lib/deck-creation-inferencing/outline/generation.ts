// Import the OutlineItem type
import { type OutlineItem } from '@/components/dialogs/deck-creation/types';
import { OllamaClient, type ChatMessage } from '@/lib/ollama';
import { logger } from "@/lib/logger";
import { type DeckTreeNode } from '@/lib/anki';
import { type PromptTemplate } from '@/stores/prompt-store';

interface PartialOutlineItem {
    partial?: string;
    concept?: string;
    key_points?: string;
    deck?: string;
    card_type?: string;
    [key: string]: string | undefined;
}

type OutlineGenerationResult = {
    result: OutlineItem[];
    ItemsWithMissingJsonFields: PartialOutlineItem[];
}

export type StreamCallback = (update: OutlineGenerationResult) => void;

// Add type for examples to avoid repetition
type ExampleCard = {
    concept: string;
    key_points: string;
    deck: string;
    card_type: string;
};

interface GenerateOutlineOptions {
    selectedNoteVariants: string[];
    parentDeck?: DeckTreeNode;
    promptId: string;
    userInput: string;
}

function buildOutlinePrompt(options: GenerateOutlineOptions, prompts: PromptTemplate[]): string {
    const rules = `
    It is of paramount importance, that you follow these rules:
    1. **Keep it Simple**: Short and simple ideas are easier to remember.
    2. **Focus on Single Ideas**: Each card should focus on one concept only.
    3. **Be Specific**: Vague or general knowledge is harder to retain.
    4. **Use Markdown**: Format the back of the card using markdown.
    5. **Strictly One Card Per Concept**: Do NOT generate more than one card per concept.
    6. **Card Type**: Each card must have a type. Examples: ${options.selectedNoteVariants.join(', ')}.
    7. **Deck Naming Format**: Deck names must follow a hierarchical structure using '::' as separator:
       - Start with the highest category (e.g., 'Uni')
       - Follow with sub-categories (e.g., semester, subject, topic)
       - End with the specific concept name
       - Example structure: 'Category::Subcategory::Subject::Topic::Concept'
       Choose or create an appropriate hierarchy based on the content.
    8. Always use a single string for all the keys in the json object`;

    // Get deck names in tree structure
    const getAllDeckNames = (node: DeckTreeNode, level = 0): string[] => {
        const indent = '  '.repeat(level);
        const bullet = level === 0 ? '•' : '  •';
        const names: string[] = [`${indent}${bullet} ${node.fullName}`];
        if (node.children.length > 0) {
            node.children.forEach(child => {
                names.push(...getAllDeckNames(child, level + 1));
            });
        }
        return names;
    };

    const existingDecks = options.parentDeck ? 
        getAllDeckNames(options.parentDeck).map(deck => `'${deck}'`).join(',\n') : '';

    const selectedCardTypes = options.selectedNoteVariants
        .map(id => `'${id}'`)
        .join(', ');

    const examples = getExamples(options.selectedNoteVariants);
    const exampleOutput = JSON.stringify(examples);

    // Get prompt template
    let prompt = prompts.find(p => p.id === options.promptId);
    if (!prompt) {
        prompt = prompts.find(p => p.id === 'default-system')!;
    }

    return prompt.systemMessage
        .replace("{existingDecks}", existingDecks)
        .replace("{selectedCardTypes}", selectedCardTypes)
        .replace("{userInput}", options.userInput)
        .replace("{exampleOutput}", exampleOutput)
        .replace("{rules}", rules);
}

function getExamples(selectedNoteVariants: string[]): ExampleCard[] {
    const allExamples: ExampleCard[] = [
        {
            "concept": "Introduction to Economics",
            "key_points": "Economics studies how individuals, businesses, and governments allocate resources.",
            "deck": "Uni::Sem 5::Economics::Basics::Introduction to Economics",
            "card_type": "q&a-system"
        },
        {
            "concept": "Solving Quadratic Equations",
            "key_points": "Quadratic equations can be solved using factoring, completing the square, or the quadratic formula.",
            "deck": "Math::Algebra::Quadratic Equations::Solving Methods",
            "card_type": "q&a-system"
        },
        {
            "concept": "Photosynthesis Process",
            "key_points": "Plants convert light energy into chemical energy through photosynthesis, producing glucose and oxygen.",
            "deck": "Science::Biology::Plant Biology::Photosynthesis::Process",
            "card_type": "concept-system"
        },
        {
            "concept": "Supply Chain Management",
            "key_points": "The coordination of activities involved in producing and delivering products from suppliers to customers.",
            "deck": "Business::Operations::Supply Chain::Management",
            "card_type": "concept-system"
        },
        {
            "concept": "Medical Terminology: Cardiovascular System",
            "key_points": "Key terms related to the heart and blood vessels, including prefixes, suffixes, and root words.",
            "deck": "Health::Medical::Terminology::Cardiovascular",
            "card_type": "vocabulary-system"
        }
    ];

    return allExamples.filter(example =>
        selectedNoteVariants.includes(example.card_type)
    );
}

export async function generateOutline(
    model: string,
    options: GenerateOutlineOptions,
    prompts: PromptTemplate[],
    onStreamUpdate?: StreamCallback,
    onDelta?: (delta: string) => void
): Promise<OutlineGenerationResult> {
    logger.info("model", model);
    
    const totalPrompt = buildOutlinePrompt(options, prompts);
    logger.info("totalPrompt", totalPrompt);

    const ollama = new OllamaClient();

    return new Promise((resolve) => {
        let currentContent = '';
        const result: OutlineGenerationResult = {
            result: [],
            ItemsWithMissingJsonFields: []
        };

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: 'You are an AI assistant that helps create Anki cards. Generate a JSON array of objects representing an outline for a deck. Each object should have "concept", "key_points", "deck", and "card_type" fields.'
            },
            {
                role: 'user',
                content: totalPrompt
            }
        ];

        // Our token update callback for streaming
        const handleDelta = (delta: { content: string, done?: boolean }) => {
            currentContent += delta.content;

            if (onDelta) {
                onDelta(delta.content);
            }

            // Process partial content to extract any complete objects
            const partialResult = parsePartialOutline(currentContent);
            
            // If callback provided, send the update
            if (onStreamUpdate) {
                onStreamUpdate(partialResult);
            }

            // Resolve when done
            if (delta.done) {
                logger.info('Stream completed. Final content:', currentContent);
                resolve(partialResult);
            }
        };

        // Stream chat completion from Ollama
        ollama.streamChatCompletion(
            messages,
            model,
            { temperature: 0.7 },
            handleDelta
        ).catch(error => {
            logger.error("Error streaming from Ollama:", error);
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
function createOutlineItem(obj: {
    concept: string;
    key_points: string;
    deck: string;
    card_type: string;
}, index: number): OutlineItem {
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
function hasAllRequiredFields(obj: Record<string, unknown>): boolean {
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
        logger.error("Error parsing outline:", e);
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
    try {
        const cleanedText = cleanJsonText(objectText);
        const parsedObject = JSON.parse(cleanedText) as Record<string, unknown>;
        // lower case all keys
        const lowerCaseObject: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsedObject)) {
            if (typeof value === 'string') {
                lowerCaseObject[key.toLowerCase()] = value;
            }
        }

        if (hasAllRequiredFields(lowerCaseObject) &&
            typeof lowerCaseObject.concept === 'string' &&
            typeof lowerCaseObject.key_points === 'string' &&
            typeof lowerCaseObject.deck === 'string' &&
            typeof lowerCaseObject.card_type === 'string') {
            // Valid complete item
            result.result.push(createOutlineItem({
                concept: lowerCaseObject.concept,
                key_points: lowerCaseObject.key_points,
                deck: lowerCaseObject.deck,
                card_type: lowerCaseObject.card_type
            }, index));
        } else {
            // Has some fields but not all
            result.ItemsWithMissingJsonFields.push(lowerCaseObject as PartialOutlineItem);
        }
        return; // RETURN IF SUCCESSFULLY PARSED
    } catch {
        // JSON parsing failed, try regex approach
    }

    // Check if text contains all required field names
    const hasAllFieldNames = REQUIRED_FIELDS.every(field =>
        objectText.includes(`"${field}"`)
    );

    if (hasAllFieldNames) {
        // Try to extract values with regex
        const extractedFields = extractFieldValuesWithRegex(objectText);
        // lower case all keys
        const lowerCaseExtractedFields = Object.fromEntries(
            Object.entries(extractedFields).map(([key, value]) => [key.toLowerCase(), value])
        );

        if (hasAllRequiredFields(lowerCaseExtractedFields) &&
            typeof lowerCaseExtractedFields.concept === 'string' &&
            typeof lowerCaseExtractedFields.key_points === 'string' &&
            typeof lowerCaseExtractedFields.deck === 'string' &&
            typeof lowerCaseExtractedFields.card_type === 'string') {
            result.result.push(createOutlineItem({
                concept: lowerCaseExtractedFields.concept,
                key_points: lowerCaseExtractedFields.key_points,
                deck: lowerCaseExtractedFields.deck,
                card_type: lowerCaseExtractedFields.card_type
            }, index));
        } else {
            result.ItemsWithMissingJsonFields.push({ partial: objectText });
        }
    } else {
        // Just a partial object without all field names
        result.ItemsWithMissingJsonFields.push({ partial: objectText });
    }
}
