import Dexie, { type EntityTable } from 'dexie';

interface Chat {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

interface Message {
    id: number;
    content: string;
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

db.version(1).stores({
    chats: '++id, name, createdAt, updatedAt',
    messages: '++id, content, createdAt, modelUsed, chatId'
});

export type { Chat };
export { db }