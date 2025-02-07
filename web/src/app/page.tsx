"use client";
import { useEffect, useState, useCallback } from 'react';
import { ankiClient, DeckTreeNode } from '@/lib/anki';
import { ollamaClient } from '@/lib/ollama';
import type { AnkiCard } from '@/lib/anki';
import { logger } from '@/lib/logger';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AppChatMessage extends ChatMessage {
  content: string;
}

interface ChatMessageDelta {
  content: string;
  done?: boolean;
}

const DeckTree = ({ nodes, parentPath = '', onSelectDeck }: { nodes: DeckTreeNode[], parentPath?: string, onSelectDeck: (deckName: string) => void }) => (
  <div className="space-y-2">
    {nodes.map((node) => {
      const fullPath = parentPath ? `${parentPath}::${node.name}` : node.name;
      return (
        <div key={fullPath} className="ml-4">
          <button
            onClick={() => onSelectDeck(fullPath)}
            className="flex items-center gap-2 hover:bg-white/10 px-4 py-2 rounded-lg"
          >
            <span className="font-medium">{node.name}</span>

          </button>
          {node.children.length > 0 && (
            <DeckTree
              nodes={node.children}
              parentPath={fullPath}
              onSelectDeck={onSelectDeck}
            />
          )}
        </div>
      );
    })}
  </div>
);

const CardList = ({ cards }: { cards: AnkiCard[] }) => (
  <div className="mt-8 border-t border-white/20 pt-6">
    <h2 className="text-xl font-semibold mb-4">Cards in Deck</h2>
    <div className="space-y-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white/10 p-4 rounded-lg">
          <div
            className="font-medium mb-2"
            dangerouslySetInnerHTML={{ __html: card.fields.Front.value }}
          />
          <div
            className="text-white/70"
            dangerouslySetInnerHTML={{ __html: card.fields.Back.value }}
          />
        </div>
      ))}
    </div>
  </div>
);

export default function Home() {
  const [data, setData] = useState<DeckTreeNode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<AnkiCard[] | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<AppChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating] = useState(false);

  useEffect(() => {
    const loadDecks = async () => {
      try {
        const decks = await ankiClient.getDeckTree();
        setData(decks);
      } catch (error) {
        logger.error('Failed to fetch decks:', error);
        setError('Failed to connect to Anki - see console for details');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDecks().catch((error) => {
      logger.error('Deck loading error:', error);
    });
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await ollamaClient.listModels();
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0] ?? '');
        }
      } catch (error) {
        logger.error('Failed to fetch models:', error);
        setError('Failed to connect to Ollama - see console for details');
      }
    };

    loadModels().catch((error) => {
      logger.error('Model loading error:', error);
    });
  }, []);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedModel || !selectedCards) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');

    try {
      const cardContext = selectedCards.map((card: AnkiCard) =>
        `Front: ${card.fields.Front.value}\nBack: ${card.fields.Back.value}`
      ).join('\n\n');

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a helpful assistant analyzing Anki flashcards. Here are the cards:\n\n${cardContext}`
        },
        userMessage
      ];

      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      await ollamaClient.streamChatCompletion(
        messages,
        selectedModel,
        { temperature: 0.7 },
        (delta: ChatMessageDelta) => {
          setChatMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                {
                  role: 'assistant',
                  content: last.content + delta.content
                }
              ];
            }
            return prev;
          });
        }
      );
    } catch (error) {
      logger.error('Chat error:', error);
      setError('Failed to generate response - see console for details');
      setChatMessages(prev => prev.filter(m => m.content !== ''));
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center gap-8 px-4 py-12">
        <h1 className="text-4xl font-bold">Your Decks</h1>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="w-full max-w-2xl">
            <DeckTree
              nodes={data ?? []}
              onSelectDeck={async (deckName) => {
                try {
                  const cards = await ankiClient.getDeckCards(deckName);
                  logger.info('Loaded cards:', cards);
                  setSelectedCards(cards);
                } catch (error) {
                  logger.error('Failed to fetch cards:', error);
                  setError('Failed to fetch cards - see console for details');
                }
              }}
            />
            {selectedCards && <CardList cards={selectedCards} />}
          </div>
        )}
        {selectedCards && (
          <div className="w-full max-w-2xl mt-8 border-t border-white/20 pt-6">
            <h2 className="text-xl font-semibold mb-4">Chat about Cards</h2>

            <select
              value={selectedModel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedModel(e.target.value)}
              className="bg-white/10 text-white p-2 rounded-lg mb-4"
            >
              {availableModels.map((model: string) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>

            <div className="bg-white/10 p-4 rounded-lg mb-4 h-64 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
                  <strong>{msg.role}:</strong>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {i === chatMessages.length - 1 && msg.role === 'assistant' && !msg.content && (
                    <span className="animate-pulse">...</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isGenerating && handleSendMessage()}
                placeholder="Ask about these cards..."
                className="flex-1 bg-white/10 text-white p-2 rounded-lg"
                disabled={isGenerating}
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
