import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/local-db";
import type { Message, ReferencedDeckToChat } from "@/local-db";
import { useLiveQuery } from "dexie-react-hooks";
import { useModelStore } from "@/stores/model-store";
import { ChatMessage, ollamaClient } from "@/lib/ollama";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";
import { logger } from "@/lib/logger";
import { EnhancedChatInput } from "./EnhancedChatInput";
import { AllDecks } from "@/components/anki/all-decks";
import { useAnkiStore } from "@/stores/anki-store";
import { type AnkiCard, ankiClient, type DeckTreeNode } from "@/lib/anki";
import { AnkiMessage } from "./AnkiMessage";
// System prompt for AI formatting instructions
const SYSTEM_PROMPT = `You are an Anki Assistant helping the user with flashcards and learning. 
When the user asks about a specific card in a deck, check if that deck was referenced earlier in the conversation with @Deck().
If the deck was referenced, you have access to its cards and should explain the requested card.

For example, if a user asks "explain the second card in my deck 02 - Languages::01 - English", and this deck was referenced earlier,
you should look for the second card in that deck and explain it in detail.

Always format your responses using proper Markdown:
- Use **bold** for emphasis
- Use *italics* when appropriate
- Use bullet points and numbered lists when listing items
- Use \`code blocks\` for code or special formatting
- Use > for quotes or important notes
- Use math notation with $$ for equations when needed
- Use tables when presenting structured information
- Structure your responses with clear headings using # and ## when appropriate
- If
`;

/**
 * Custom hook to manage chat ID and name from URL
 */
const useChatNavigation = () => {
    const { slug } = useParams();
    const router = useRouter();
    const [chatId, setChatId] = useState<string | null>(null);
    const [chatName, setChatName] = useState<string>("");

    // Get chat ID from URL
    useEffect(() => {
        if (slug && Array.isArray(slug) && slug.length > 0) {
            setChatId(slug[0] ?? null);
        } else {
            router.push("/chat");
        }
    }, [slug, router]);

    // Load chat name from database
    useEffect(() => {
        if (!chatId) return;

        db.chats.get(Number(chatId))
            .then(chat => {
                if (chat) {
                    setChatName(chat.name);
                } else {
                    router.push("/chat");
                }
            })
            .catch(error => {
                logger.error("Error loading chat:", error);
                router.push("/chat");
            });
    }, [chatId, router]);

    return { chatId, chatName };
};

/**
 * Custom hook to manage chat messages
 */
const useChatMessages = (chatId: string | null) => {
    const [isLoading, setIsLoading] = useState(true);

    // Query messages from the database
    const messages = useLiveQuery<Message[]>(() => {
        return chatId
            ? (db.messages.where('chatId').equals(Number(chatId)).sortBy('createdAt') as Promise<Message[]>)
            : Promise.resolve([]);
    }, [chatId]);

    // Update loading state when messages are available
    useEffect(() => {
        if (messages !== undefined) {
            setIsLoading(false);
        }
    }, [messages]);

    // Check if an assistant message is currently being generated
    const hasGeneratingMessage = messages?.some(
        (msg: Message) => msg?.role === 'assistant' && msg?.content === ''
    ) ?? false;

    return { messages, isLoading, hasGeneratingMessage };
};

/**
 * Custom hook to handle AI inference
 */
const useAIInference = (chatId: string | null) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { chatName } = useChatNavigation();

    // Generate a short chat name based on user message
    const generateChatName = useCallback(async (userMessage: string, chatId: string) => {
        try {
            const model = useModelStore.getState().chatModel;
            if (!model) return;

            const namePrompt = [
                {
                    role: 'system' as const,
                    content: `Generate a concise, descriptive name for a chat based on the user's first message.

Rules for name generation:
1. LENGTH: Must be 2-4 words maximum
2. CHARACTERS: Must be under 30 characters total
3. FORMAT: Use Title Case (capitalize first letter of each word)
4. CONTENT: Focus on the main topic or question
5. FALLBACK: Use "New Chat" if message is:
   - A greeting only
   - Too vague
   - Not task-related
   - Unclear purpose

Examples:
User: "Can you help me learn about mitochondria and cell energy production?"
Response: Cell Energy Basics

User: "I need help creating flashcards for French verbs"
Response: French Verb Cards

User: "What's the difference between DNA and RNA?"
Response: DNA RNA Compare

User: "hello! how are you doing today?"
Response: New Chat

User: "can you explain quantum mechanics to me?"
Response: Quantum Physics Intro

IMPORTANT:
- Output ONLY the name
- NO quotes, tags, or explanations
- NO special characters except spaces
- ALWAYS use proper Title Case`
                },
                {
                    role: 'user' as const,
                    content: userMessage
                }
            ];

            // Generate a name
            let generatedName = '';
            await ollamaClient.streamChatCompletion(
                namePrompt,
                model,
                {},
                (delta) => {
                    if (delta.content) {
                        generatedName += delta.content;
                    }
                }
            );

            generatedName = cleanGeneratedChatName(generatedName);

            // Update the chat name in the database if valid
            if (generatedName) {
                await db.chats.update(Number(chatId), { name: generatedName });
            }
        } catch (error) {
            logger.error("Error generating chat name:", error);
        }
    }, []);

    // Effect to handle name generation when the chat name is the placeholder
    useEffect(() => {
        const handleNameGeneration = async () => {
            if (!chatId || chatName !== "Generating name...") return;

            try {
                // Get the first user message to generate the name
                const messages = await db.messages
                    .where('chatId')
                    .equals(Number(chatId))
                    .filter(msg => msg.role === 'user')
                    .sortBy('createdAt');

                if (messages.length === 0) return;

                // Use the first user message for name generation
                const firstUserMessage = messages[0]?.content ?? '';
                if (!firstUserMessage) return;

                await generateChatName(firstUserMessage, chatId);
            } catch (error) {
                logger.error("Error in name generation effect:", error);
            }
        };

        void handleNameGeneration();
    }, [chatId, chatName, generateChatName]);

    /**
     * Helper function to clean the generated chat name
     */
    const cleanGeneratedChatName = (name: string): string => {
        if (!name) return '';

        let cleanedName = name;

        // First try to extract content after </think> or </rhink> tags if they exist
        const thinkCloseMatch = /<\/(?:think|rhink)>/i.exec(cleanedName);
        if (thinkCloseMatch?.index) {
            cleanedName = cleanedName.substring(thinkCloseMatch.index + thinkCloseMatch[0].length);
        }

        // Remove any remaining think tags and their content
        cleanedName = cleanedName.replace(/<(?:think|rhink)[^>]*>.*?<\/(?:think|rhink)>/gi, '');

        // Remove any standalone tags
        cleanedName = cleanedName.replace(/<\/?[^>]+>/g, '');

        // Remove any quotes that might surround the name
        cleanedName = cleanedName.replace(/^["']|["']$/g, '');

        // Remove any extra spaces and trim
        cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

        // If nothing valid left, use a fallback
        if (!cleanedName.trim()) {
            const timestamp = new Date().toLocaleTimeString();
            cleanedName = `Chat ${timestamp}`;
        }

        return cleanedName;
    };

    // Start AI inference with a user message
    // eslint-disable-next-line
    const startInference = useCallback(async () => {
        if (isSubmitting || !chatId) return;

        setIsSubmitting(true);

        try {
            const model = useModelStore.getState().chatModel;
            if (!model) {
                logger.error("No model selected");
                return;
            }

            // Create initial empty assistant message
            const assistantMessageId = await db.messages.add({
                content: '',
                role: 'assistant',
                createdAt: new Date(),
                modelUsed: model,
                chatId: Number(chatId),
            });

            // Process in background to not block UI
            setTimeout(() => {
                void (async () => {
                    try {
                        await processAIResponse(Number(chatId), model, assistantMessageId);
                    } catch (error) {
                        logger.error("Error in background AI processing:", error);
                    }
                })();
            }, 0);
        } catch (error) {
            logger.error("Error starting inference:", error);
        } finally {
            setIsSubmitting(false);
        }
    },
        // eslint-disable-next-line
        [chatId, isSubmitting, chatName]);

    return { isSubmitting, startInference };
};

/**
 * Process AI response by fetching chat history and streaming completion
 */
async function processAIResponse(chatId: number, model: string, assistantMessageId: number) {
    // Get the current chat history
    const chatHistory = await db.messages
        .where('chatId')
        .equals(chatId)
        .sortBy('createdAt');

    console.log('chatHistory', chatHistory);

    // Format messages for Ollama API
    const formattedMessages = chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system' | 'anki',
        content: msg.content
    }));

    // Remove the empty assistant message we just created from the chat history
    formattedMessages.pop();

    // Get deck information from Anki messages
    const ankiMessages = chatHistory.filter(msg => msg.role === 'anki');
    let deckContext = '';

    if (ankiMessages.length > 0) {
        deckContext = `\n\nThe following Anki decks have been referenced in this conversation:\n`;
        for (const msg of ankiMessages) {
            const deckName = msg.content.trim().split('\n')[0]?.trim().split(':')[1]?.trim() || 'Unknown Deck';
            deckContext += `- ${deckName}\n`;
        }
        deckContext += `\nWhen the user asks about cards in these decks, use the information that was shown earlier in the conversation.`;
    }

    // Add system message with formatting instructions and deck context
    formattedMessages.unshift({
        role: 'system',
        content: SYSTEM_PROMPT + deckContext
    });

    // Stream the response
    let content = '';
    await ollamaClient.streamChatCompletion(
        formattedMessages as ChatMessage[],
        model,
        {},
        (delta) => {
            if (delta.content) {
                content += delta.content;
                void db.messages.update(assistantMessageId, { content });
            }
        }
    );
}

/**
 * Custom hook to handle auto-inference from URL parameters
 */
const useAutoInference = (
    chatId: string | null,
    messages: Message[] | undefined,
    isLoading: boolean,
    hasGeneratingMessage: boolean,
    startInference: () => Promise<void>
) => {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (isLoading || !Array.isArray(messages) || messages.length === 0 || hasGeneratingMessage) return;

        const shouldStartInference = searchParams.get('startInference') === 'true';
        if (!shouldStartInference) return;

        // Remove parameter from URL to prevent re-triggering
        const url = new URL(window.location.href);
        url.searchParams.delete('startInference');
        window.history.replaceState({}, '', url.toString());

        // Start inference if the last message is from user
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'user') {
            void startInference();
        }
    }, [isLoading, messages, hasGeneratingMessage, startInference, searchParams]);
};

/**
 * Component to show the chat loading state
 */
const ChatLoadingState = () => (
    <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading messages...</p>
    </div>
);

/**
 * Component to show empty chat state
 */
const EmptyChatState = () => (
    <div className="flex flex-col items-center justify-center h-32">
        <p className="text-muted-foreground">No messages yet</p>
    </div>
);

/**
 * Component to show the generating indicator
 */
const GeneratingIndicator = () => (
    <div className="flex items-center justify-start gap-2 text-muted-foreground animate-pulse">
        <span className="text-sm">Generating response</span>
        <span>...</span>
    </div>
);

/**
 * Component to display the messages
 */
const MessagesList = ({ messages }: { messages: Message[] }) => (
    <>
        {messages
            .filter((message: Message) => message?.role ?? false)
            .map((message: Message) =>
                message.role === 'user' ? (
                    <div key={message.id} className="mt-0">
                        <UserMessage message={message} />
                    </div>
                ) : (
                    message.role === 'anki' ? (
                        <AnkiMessage key={message.id} content={message.content} />
                    ) : (
                        <div key={message.id} className="pb-4">
                            <AssistantMessage message={message} />
                        </div>
                    )
                )
            )
        }
    </>
);

/**
 * Main ChatContent component that orchestrates the chat functionality
 */
export const ChatContent = () => {
    const [inputText, setInputText] = useState("");
    const { chatId } = useChatNavigation();
    const { messages, isLoading, hasGeneratingMessage } = useChatMessages(chatId);
    const { isSubmitting, startInference } = useAIInference(chatId);
    const { decks } = useAnkiStore();
    const [cards, setCards] = useState<AnkiCard[]>([]);

    // Define the deck reference extraction function
    const findReferencedDecks = (message: string) => {
        const deckRegex = /@Deck\(([^)]+)\)/g;
        const matches = message.match(deckRegex);
        return matches ? matches.map(match => match.replace(/@Deck\(([^)]+)\)/, '$1')) : [];
    };

    const referencedDecks = useLiveQuery<ReferencedDeckToChat[]>(() => {
        return db.referencedDecksToChat.where('chatId').equals(Number(chatId)).toArray();
    }, [chatId]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadCards = async () => {
            try {
                // Start with empty cards array
                setCards([]);

                if (!referencedDecks || referencedDecks.length === 0) {
                    // No decks to load if no references
                    logger.info('No referenced decks to load');
                    return;
                } else {
                    // Load each referenced deck sequentially
                    const allCards = new Map();

                    // Process referenced decks sequentially
                    for (const deckRef of referencedDecks) {
                        if (!isMounted) return;

                        try {
                            const stream = ankiClient.streamDeckCards(deckRef.deckFullName, 10, controller.signal);

                            // Wait for this deck's stream to complete before moving to next deck
                            for await (const batch of stream) {
                                if (!isMounted) return;

                                // Update the map with new cards
                                batch.forEach(newCard => allCards.set(newCard.cardId, newCard));

                                // Update the cards state to show progress
                                setCards(Array.from(allCards.values()));
                            }

                            // Log successful load
                            logger.info(`Loaded cards from deck: ${deckRef.deckFullName}`);
                        } catch (error) {
                            if (isMounted) logger.error(`Failed to load cards from deck: ${deckRef.deckFullName}`, error);
                            // Continue with next deck even if this one failed
                        }
                    }

                    // Final update with all cards
                    if (isMounted) {
                        setCards(Array.from(allCards.values()));
                    }
                }
            } catch (error) {
                if (isMounted) logger.error('Card loading interrupted', error);
            }
        };

        void loadCards();
        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [referencedDecks]);

    // Set up auto-inference from URL parameter
    useAutoInference(chatId, messages, isLoading, hasGeneratingMessage, startInference);

    // Handle sending a new message
    const handleSendMessage = async () => {
        if (!inputText.trim() || isSubmitting || !chatId) return;

        const messageToSend = inputText.trim();
        setInputText("");


        try {
            await db.messages.add({
                content: messageToSend,
                role: 'user',
                createdAt: new Date(),
                modelUsed: "",
                chatId: Number(chatId),
            });
        } catch (error) {
            logger.error("Error sending message:", error);
        }

        // Extract referenced decks from the message
        const referencedDeckNames = findReferencedDecks(messageToSend);
        const deckValidationResults = [];
        // Check if decks exist and log simple results
        for (const deckName of referencedDeckNames) {
            const exists = doesDeckExist(deckName, decks);
            deckValidationResults.push({ name: deckName, exists });
        }

        // for each valid deck, add it to referencedDecks if not already present
        for (const deck of deckValidationResults) {
            if (deck.exists) {
                // check if deck is already referenced
                const isReferenced = await db.referencedDecksToChat
                    .filter(d => d.deckFullName === deck.name && d.chatId === Number(chatId))
                    .first();

                if (!isReferenced) {
                    await db.referencedDecksToChat.add({ deckFullName: deck.name, chatId: Number(chatId) });
                }

                const content = await getAnkiDeckContent(deck.name, decks);

                // add a "Anki Deck" message to the chat
                await db.messages.add({
                    content: content,
                    role: 'anki',
                    createdAt: new Date(),
                    modelUsed: "",
                    chatId: Number(chatId),
                });
            }
        }

        try {
            // Start AI response
            await startInference();
        } catch (error) {
            logger.error("Error sending message:", error);
        }
    };

    return (
        <div className="flex flex-row h-[calc(100vh-20px)] p-4 pb-2">
            {/* Left Chat Area */}
            <div className="flex-1 flex flex-col p-2">
                <ScrollArea className="flex-1 pr-1 scroll-area">
                    <div className="pr-4">
                        <div className="max-w-3xl mx-auto p-4 space-y-2">
                            {isLoading ? (
                                <ChatLoadingState />
                            ) : !Array.isArray(messages) || messages.length === 0 ? (
                                <EmptyChatState />
                            ) : (
                                <MessagesList messages={messages} />
                            )}
                            {hasGeneratingMessage && <GeneratingIndicator />}
                        </div>
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>

                <EnhancedChatInput
                    inputText={inputText}
                    setInputText={setInputText}
                    isSubmitting={isSubmitting}
                    onSendMessage={handleSendMessage}
                />
            </div>

            <Separator orientation="vertical" className="px-0.5 rounded-xl" />

            {/* Right Preview Area */}
            <div className="flex-1">
                <ScrollArea className="h-full pr-1">
                    <div className="pr-4">
                        <div className="max-w-3xl mx-auto p-4 text-muted-foreground">
                            <AllDecks cards={cards} />
                        </div>
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </div>
        </div>
    );
};

// Function to check if a deck exists in the deck collection
function doesDeckExist(deckName: string, allDecks: DeckTreeNode[]): boolean {
    // Get all deck names including children
    const getAllDeckNames = (decks: DeckTreeNode[]): string[] => {
        let names: string[] = [];

        for (const deck of decks) {
            // Add current deck name
            names.push(deck.fullName);

            // Add all children's names recursively
            if (deck.children && deck.children.length > 0) {
                names = names.concat(getAllDeckNames(deck.children));
            }
        }

        return names;
    };

    // Get all deck names including children
    const allDeckNames = getAllDeckNames(allDecks);

    // Simple existence check
    return allDeckNames.some(name =>
        name === deckName ||
        name.includes(deckName)
    );


}

async function getAnkiDeckContent(deckName: string, decks: DeckTreeNode[]): Promise<string> {
    // Find all matching decks including children
    const findAllMatchingDecks = (deckToFind: string, allDecks: DeckTreeNode[]): DeckTreeNode[] => {
        let result: DeckTreeNode[] = [];

        for (const deck of allDecks) {
            // Add the deck if it matches exactly
            if (deck.fullName === deckToFind) {
                result.push(deck);
            }

            // Recursively check children
            if (deck.children.length > 0) {
                result = result.concat(findAllMatchingDecks(deckToFind, deck.children));
            }
        }

        return result;
    };

    // Get the requested deck (without child decks)
    const exactMatchingDecks = findAllMatchingDecks(deckName, decks);
    console.log("Found exact matching deck:", exactMatchingDecks.map(d => d.fullName));

    // If no exact match was found, try fuzzy matching
    if (exactMatchingDecks.length === 0) {
        // Get all deck names including children
        const getAllDeckNames = (someDecks: DeckTreeNode[]): string[] => {
            let names: string[] = [];

            for (const deck of someDecks) {
                names.push(deck.fullName);
                if (deck.children.length > 0) {
                    names = names.concat(getAllDeckNames(deck.children));
                }
            }

            return names;
        };

        const allDeckNames = getAllDeckNames(decks);
        const fuzzyMatch = allDeckNames.find(name =>
            name.includes(deckName) ||
            deckName.includes(name)
        );

        if (fuzzyMatch) {
            console.log(`Using fuzzy match: ${fuzzyMatch} for ${deckName}`);
            return getAnkiDeckContent(fuzzyMatch, decks);
        }
    }

    const mainDeckContent = await Promise.all(exactMatchingDecks.map(async (deck) => {
        // get all cards from the deck
        const cards = await ankiClient.getDeckCards(deck.fullName);

        return `
        DECK: ${deck.fullName}
        CARDS: ${cards.length}
        ${cards.map((card, index) => `
        CARD ${index + 1}:
        ${card.fields.Front}
        ${card.fields.Back}
        `).join('\n --- \n ---\n')}
        `;
    }));

    const content = `
    TOP DECK: ${deckName}
    ${mainDeckContent.length > 0 ? mainDeckContent.join('\n --- \n ---\n') : 'No cards found in this deck'}
    `;

    return content;
}

export default ChatContent; 