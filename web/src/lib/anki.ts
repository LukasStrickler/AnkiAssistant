import { type ConnectionStatus } from "@/types/connection-status";
import { logger } from "@/lib/logger";
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

export interface AnkiCard {
    cardId: number;
    deckName: string;
    fields: {
        Front: { value: string };
        Back: { value: string };
    };
}

export interface AnkiCardRaw {
    cardId: number;
    deckName: string;
    fields: Record<string, { value: string; order: number }>;
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
            fields: { Front: { value: '' }, Back: { value: '' } }
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
        for (const { cardId, deckName, fields } of cards) {
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
                    Front: { value: frontField.value },
                    Back: { value: backField.value }
                }
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
        return [card.fields.Front.value, card.fields.Back.value]
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

        card.fields.Front.value = replaceMediaSource(card.fields.Front.value);
        card.fields.Back.value = replaceMediaSource(card.fields.Back.value);
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
}

// Create a default instance
export const ankiClient = new AnkiClient();

// Add this utility function outside the class
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}