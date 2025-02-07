interface AnkiRequest {
    action: string;
    version: number;
    [key: string]: unknown;
}

interface AnkiResponse<T> {
    result: T;
    error?: string;
}

interface CardsInfoResponse {
    result: AnkiCard[];
    error?: string;
}

export interface DeckTreeNode {
    name: string;
    children: DeckTreeNode[];
}

export interface AnkiCard {
    cardId: number;
    fields: {
        Front: { value: string };
        Back: { value: string };
    };
    // Add other necessary fields
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

    async getDecks(): Promise<string[]> {
        return this.request<string[]>({
            action: "deckNames",
            version: 6
        });
    }

    async getDeckCards(deckName: string): Promise<AnkiCard[]> {
        const cardIds = await this.request<number[]>({
            action: "findCards",
            version: 6,
            params: { query: `deck:"${deckName}"` }
        });

        return this.request<AnkiCard[]>({
            action: "cardsInfo",
            version: 6,
            params: { cards: cardIds }
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

    private buildDeckTree(deckNames: string[]): DeckTreeNode[] {
        const root: DeckTreeNode = { name: '', children: [] };
        const nodeMap = new Map<string, DeckTreeNode>([['', root]]);

        for (const deckName of deckNames) {
            let path = '';
            let parentNode = root;

            for (const part of deckName.split('::')) {
                const newPath = path ? `${path}::${part}` : part;

                if (!nodeMap.has(newPath)) {
                    const newNode: DeckTreeNode = {
                        name: part,
                        children: []
                    };
                    nodeMap.set(newPath, newNode);
                    parentNode.children.push(newNode);
                }

                parentNode = nodeMap.get(newPath)!;
                path = newPath;
            }
        }

        return root.children;
    }
}

// Create a default instance
export const ankiClient = new AnkiClient();