import Dexie, { type EntityTable } from 'dexie';

interface Chat {
    id: number;
    name: string;
    createdAt: Date;
}

interface Message {
    id: number;
    content: string;
    role: 'user' | 'assistant' | 'anki';
    createdAt: Date;
    modelUsed: string;
    chatId: number;
}


interface ReferencedDeckToChat {
    id: number;
    deckFullName: string;
    chatId: number;
}

const db = new Dexie('ChatsDatabase') as Dexie & {
    chats: EntityTable<
        Chat,
        'id'
    >;
    messages: EntityTable<
        Message,
        'id'
    >;
    referencedDecksToChat: EntityTable<
        ReferencedDeckToChat,
        'id'
    >;
};

db.version(10).stores({
    chats: '++id, name, createdAt',
    messages: '++id, content, role, createdAt, modelUsed, chatId',
    referencedDecksToChat: '++id, deckFullName, chatId'
});

export type { Chat, Message, ReferencedDeckToChat };
export { db }