import { type ConnectionStatus } from "@/types/connection-status";
import { logger } from "@/lib/logger";
import { type OutlineItem } from "@/components/dialogs/deck-creation/types";
import MarkdownIt from 'markdown-it';

// Initialize markdown-it with HTML enabled and other useful features
const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
});

// Ensure list parsing is enabled
md.enable('list');

interface AnkiRequest {
    action: string;
    version: number;
    [key: string]: unknown;
}

interface AnkiResponse<T> {
    result: T;
    error?: string;
}

export interface DeckTreeNode {
    name: string;
    fullName: string;
    children: DeckTreeNode[];
    cardCount: number;
}

export enum AnkiCardStatus {
    Anki = 'anki',
    Generating = 'generating',
    Generated = 'generated',
}

export interface BaseAnkiCard {
    deckName: string;
    modelName: string;
    fields: {
        Front: string;
        Back: string;
    };
    tags: string[];
}

export interface AnkiCard extends BaseAnkiCard {
    cardId: number;
    status: AnkiCardStatus;
}

export interface AnkiCardRaw {
    cardId: number;
    deckName: string;
    fields: Record<string, { value: string; order: number }>;
    modelName: typeof AnkiCardTypes.BASIC[number];
}

export const AnkiCardTypes = {
    BASIC: ["Basic", "Einfach"], //Translations
    CARD_TYPE_NOT_SUPPORTED: "CARD TYPE NOT SUPPORTED"
} as const;

export type AnkiCardType = (typeof AnkiCardTypes)[keyof typeof AnkiCardTypes];

const MATH_REPLACE = "ANKIASSISTANTMATH";
const INLINE_CODE_REPLACE = "ANKIASSISTANTCODEINLINE";
const DISPLAY_CODE_REPLACE = "ANKIASSISTANTCODEDISPLAY";

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export class AnkiClient {
    private apiUrl: string;

    constructor(apiUrl = 'http://localhost:8765') {
        this.apiUrl = apiUrl;
    }

    private async request<T>(params: AnkiRequest): Promise<T> {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...params,
                version: 6  // Ensure version is always included
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as AnkiResponse<T>;

        if (data.error) {
            throw new Error(`Anki error: ${data.error}`);
        }

        return data.result;
    }

    async getConnectionStatus(): Promise<ConnectionStatus> {
        try {
            await this.request<string>({
                action: "deckNames",
                version: 6
            });
            return 'connected';
        } catch (error) {
            logger.error('Failed to get connection status', error)
            return 'disconnected';
        }
    }


    async getDecks(): Promise<string[]> {
        return this.request<string[]>({
            action: "deckNames",
            version: 6
        });
    }

    async getDeckCardCount(deckName: string): Promise<number> {
        const cardIds = await this.request<number[]>({
            action: "findCards",
            version: 6,
            params: { query: `deck:"${deckName}"*` }
        });
        return cardIds.length;
    }

    async getDeckTree(): Promise<DeckTreeNode[]> {
        const deckNames = await this.getDecks();
        return this.buildDeckTree(deckNames);
    }

    async getDeckCards(deckName: string): Promise<AnkiCard[]> {
        const cardIds = await this.fetchCardIdsForDeck(deckName);
        const IdsToDeckName = await this.fetchDecksToIds(cardIds);
        const cards = await this.fetchCardsInfo(cardIds);
        cards.forEach(card => {
            card.deckName = IdsToDeckName.get(card.cardId) ?? '';
        });

        await this.replaceMediaReferencesWithDataUrls(cards);
        return cards;
    }

    async *streamDeckCards(deckName: string, batchSize = 10, signal?: AbortSignal): AsyncGenerator<AnkiCard[]> {
        const cardIds = await this.fetchCardIdsForDeck(deckName);
        const IdsToDeckName = await this.fetchDecksToIds(cardIds);

        // Initial yield with empty cards containing only IDs
        yield cardIds.map(id => ({
            cardId: id,
            deckName: IdsToDeckName.get(id) ?? '',
            fields: { Front: '', Back: '' },
            tags: [],
            status: AnkiCardStatus.Anki,
            modelName: ""
        }));

        // Process cards in batches
        for (let i = 0; i < cardIds.length; i += batchSize) {
            // Check abort status before each batch
            if (signal?.aborted) break;

            const batchIds = cardIds.slice(i, i + batchSize);
            const cards = await this.fetchCardsInfo(batchIds);

            // Update deck names and media for this batch
            cards.forEach(card => {
                card.deckName = IdsToDeckName.get(card.cardId) ?? '';
            });
            await this.replaceMediaReferencesWithDataUrls(cards);

            yield cards;
        }
    }

    private async fetchDecksToIds(cardIds: number[]): Promise<Map<number, string>> {
        const decks = await this.request<Record<string, number[]>>({
            action: "getDecks",
            version: 6,
            params: { cards: cardIds }
        });

        const idToDeckMap = new Map<number, string>();
        for (const [deckName, deckCardIds] of Object.entries(decks)) {
            for (const cardId of deckCardIds) {
                idToDeckMap.set(cardId, deckName);
            }
        }
        return idToDeckMap;
    }


    private async fetchCardIdsForDeck(deckName: string): Promise<number[]> {
        return this.request<number[]>({
            action: "findCards",
            version: 6,
            params: { query: `deck:"${deckName}"` }
        });
    }

    private async fetchCardsInfo(cardIds: number[]): Promise<AnkiCard[]> {
        const cards = await this.request<AnkiCardRaw[]>({
            action: "cardsInfo",
            version: 6,
            params: { cards: cardIds }
        });

        const cardMap = new Map<number, AnkiCard>();
        for (const { cardId, deckName, fields, modelName } of cards) {
            if (!AnkiCardTypes.BASIC.includes(modelName)) {
                logger.warn(`Card ${cardId} has model ${modelName} which is not supported`, { cardId, deckName, fields, modelName });
                cardMap.set(cardId, {
                    cardId,
                    deckName,
                    fields: {
                        Front: AnkiCardTypes.CARD_TYPE_NOT_SUPPORTED,
                        Back: "Check the logs for more details, contact the developer to add support for this card type."
                    },
                    tags: [],
                    status: AnkiCardStatus.Anki,
                    modelName: AnkiCardTypes.CARD_TYPE_NOT_SUPPORTED
                });
                continue;
            }

            const fieldValues = Object.values(fields);
            const frontField = fieldValues.find(f => f.order === 0);
            const backField = fieldValues.find(f => f.order === 1);

            if (!frontField || !backField) {
                logger.error(`Missing front or back field for card ${cardId}`, { cardId, deckName, fields });
                continue;
            }

            cardMap.set(cardId, {
                cardId,
                deckName,
                fields: {
                    Front: frontField.value,
                    Back: backField.value
                },
                tags: [],
                status: AnkiCardStatus.Anki,
                modelName
            });
        }
        return Array.from(cardMap.values());
    }

    private async replaceMediaReferencesWithDataUrls(cards: AnkiCard[]): Promise<void> {
        const MEDIA_REFERENCE_REGEX = /<img src=["']([^"']+)["']/gi;
        const cardMap = new Map(cards.map(card => [card.cardId, card]));

        const mediaReferences = cards.flatMap(card =>
            this.extractMediaReferencesFromCard(card, MEDIA_REFERENCE_REGEX)
        );

        await Promise.all(mediaReferences.map(async ({ src, cardId }) => {
            try {
                const card = cardMap.get(cardId);
                if (!card || !src) return;

                const mediaData = await this.fetchMediaData(src);
                if (!mediaData) return;

                this.updateCardFieldsWithDataUrl(card, src, mediaData);
            } catch (error) {
                logger.error(`Failed processing media for card ${cardId} (${src})`, error);
            }
        }));
    }

    private extractMediaReferencesFromCard(
        card: AnkiCard,
        regex: RegExp
    ): Array<{ src: string; cardId: number }> {
        return [card.fields.Front, card.fields.Back]
            .flatMap(fieldContent =>
                Array.from(fieldContent.matchAll(regex))
                    .map(match => ({
                        src: match[1]!,
                        cardId: card.cardId
                    }))
            );
    }

    private async fetchMediaData(filename: string): Promise<string | null> {
        try {
            return await this.request<string>({
                action: "retrieveMediaFile",
                version: 6,
                params: { filename }
            });
        } catch (error) {
            logger.error(`Failed to fetch media file ${filename}`, error);
            return null;
        }
    }

    private updateCardFieldsWithDataUrl(
        card: AnkiCard,
        originalSrc: string,
        mediaData: string
    ): void {
        const dataUrl = this.createMediaDataUrl(originalSrc, mediaData);
        const replaceMediaSource = this.createMediaReplacer(originalSrc, dataUrl);

        card.fields.Front = replaceMediaSource(card.fields.Front);
        card.fields.Back = replaceMediaSource(card.fields.Back);
    }

    /**
     * Creates a data URL from media file content
     * @param filename Used to determine file extension
     * @param content Base64-encoded file content
     */
    private createMediaDataUrl(filename: string, content: string): string {
        const fileExtension = filename.split('.').pop()?.toLowerCase() ?? 'png';
        return `data:image/${fileExtension};base64,${content}`;
    }

    /**
     * Creates a function to replace all occurrences of a media reference
     * with a data URL
     */
    private createMediaReplacer(
        originalSrc: string,
        replacementUrl: string
    ): (html: string) => string {
        const escapedSrc = escapeRegExp(originalSrc);
        const mediaReferenceRegex = new RegExp(`src=["']${escapedSrc}["']`, 'gi');
        return (html: string) => html.replace(mediaReferenceRegex, `src="${replacementUrl}"`);
    }

    private async buildDeckTree(deckNames: string[]): Promise<DeckTreeNode[]> {
        const root: DeckTreeNode = { name: '', children: [], cardCount: 0, fullName: '' };
        const nodeMap = new Map<string, DeckTreeNode>([['', root]]);

        // First pass: build the tree structure
        for (const deckName of deckNames) {
            let path = '';
            let parentNode = root;

            for (const part of deckName.split('::')) {
                const newPath = path ? `${path}::${part}` : part;

                if (!nodeMap.has(newPath)) {
                    const newNode: DeckTreeNode = {
                        name: part,
                        children: [],
                        cardCount: 0,
                        fullName: newPath
                    };
                    nodeMap.set(newPath, newNode);
                    parentNode.children.push(newNode);
                }

                parentNode = nodeMap.get(newPath)!;
                path = newPath;
            }
        }

        const deckCountRequests = deckNames.map(deckName => ({
            action: "findCards",
            params: { query: `deck:"${deckName}"` }
        }));

        const counts = await this.request<number[][]>({
            action: "multi",
            version: 6,
            params: { actions: deckCountRequests }
        });

        deckNames.forEach((deckName, index) => {
            const node = nodeMap.get(deckName);
            if (node) {
                node.cardCount = counts[index]?.length ?? 0;
            }
        });

        return root.children;
    }


    // -------------
    // Adding Cards
    // -------------
    async addCardFromOutline(outline: OutlineItem): Promise<void> {
        if (!outline.card) {
            throw new Error("Card is undefined");
        }

        const card: BaseAnkiCard = {
            deckName: outline.deck,
            modelName: "Basic",
            fields: {
                Front: convertMarkdownToAnkiHTML(outline.card.front),
                Back: convertMarkdownToAnkiHTML(outline.card.back)
            },
            tags: [outline.card_type]
        }
        const noteId = await this.addCard(card, true); // Auto create deck if not present
        if (!noteId) {
            throw new Error("Failed to add card");
        }
        logger.info("Card added result", { noteId });
        // get notesInfo to verify that the card was added
        const notesInfo = await this.request<number[][]>({
            action: "notesInfo",
            version: 6,
            params: { notes: [noteId] }
        });
        logger.info("Card added notesInfo", { notesInfo });

        if (!notesInfo.length || !notesInfo[0]) {
            throw new Error("Failed to find card");
        }
    }

    async createDeck(deckName: string): Promise<void> {
        await this.request<boolean>({
            action: "createDeck",
            version: 6,
            params: { deck: deckName }
        });
    }

    async addCard(card: BaseAnkiCard, autoCreateDeck = false): Promise<number | null> {
        if (autoCreateDeck) {
            await this.createDeck(card.deckName);
        }

        const result = await this.request<number>({
            action: "addNote",
            version: 6,
            params: {
                note: {
                    deckName: card.deckName,
                    modelName: card.modelName,
                    fields: card.fields,
                    tags: [...card.tags, "AnkiAssistant"],
                    options: {
                        allowDuplicate: false,
                        duplicateScope: "deck",
                        duplicateScopeOptions: {
                            deckName: card.deckName
                        }
                    }
                }
            }
        });
        return result;
    }

}

// Create a default instance
export const ankiClient = new AnkiClient();

// Add this utility function outside the class
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts Markdown and LaTeX content to Anki-compatible HTML format
 * @param content The markdown content with optional LaTeX math expressions
 * @returns HTML string with properly formatted LaTeX for Anki
 */
export function convertMarkdownToAnkiHTML(content: string): string {
    // First, we need to protect math expressions from markdown processing
    const mathExpressions: string[] = [];
    const inlineCodeExpressions: string[] = [];
    const displayCodeExpressions: string[] = [];

    // Save math expressions and replace with placeholders
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
        mathExpressions.push(`\\[${latex}\\]`);
        return MATH_REPLACE;
    });

    content = content.replace(/\$([^\$]+)\$/g, (_match, latex) => {
        mathExpressions.push(`\\(${latex}\\)`);
        return MATH_REPLACE;
    });

    // Save code blocks and replace with placeholders
    content = content.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
        displayCodeExpressions.push(code);
        return DISPLAY_CODE_REPLACE;
    });

    content = content.replace(/`([^`]+)`/g, (_match, code: string) => {
        inlineCodeExpressions.push(code);
        return INLINE_CODE_REPLACE;
    });

    // Convert markdown to HTML
    content = md.render(content);

    // Restore math expressions with proper HTML escaping
    mathExpressions.forEach(math => {
        content = content.replace(
            MATH_REPLACE,
            escapeHtml(math)
        );
    });

    // Restore code blocks with proper formatting
    displayCodeExpressions.forEach(code => {
        content = content.replace(
            DISPLAY_CODE_REPLACE,
            `<pre><code>${escapeHtml(code)}</code></pre>`
        );
    });

    inlineCodeExpressions.forEach(code => {
        content = content.replace(
            INLINE_CODE_REPLACE,
            `<code>${escapeHtml(code)}</code>`
        );
    });

    return content.trim();
}