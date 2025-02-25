import Dexie, { type EntityTable } from 'dexie';

interface Chat {
    id: number;
    name: string;
    createdAt: Date;
}

interface Message {
    id: number;
    content: string;
    role: 'user' | 'assistant';
    createdAt: Date;
    modelUsed: string;
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
};

db.version(4).stores({
    chats: '++id, name, createdAt',
    messages: '++id, content, role, createdAt, modelUsed, chatId'
});

export type { Chat, Message };
export { db }