"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, FolderSearch, FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAnkiStore } from "@/stores/anki-store";
import { DeckCreationDialogTrigger } from "@/components/dialogs/deck-creation/deck-creation-trigger";
import { useState } from "react";
import { DeckTreeNode } from "@/lib/anki";
export default function Home() {
  const router = useRouter();
  const { expandAllDecks, setHighlightDecks } = useAnkiStore();

  const handleViewDecks = () => {
    // Expand all decks and trigger highlight animation
    expandAllDecks();
    setHighlightDecks(true);
  };

  const [open, setOpen] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const { decks } = useAnkiStore();

  // export interface DeckTreeNode {
  //     name: string;
  //     fullName: string;
  //     children: DeckTreeNode[];
  //     cardCount: number;
  // }
  const parentDeck: DeckTreeNode = {
    name: "",
    fullName: "",
    children: decks,
    cardCount: 0
  }
  return (
    <main className="h-full flex items-center justify-center bg-background rounded-xl">
      <div className="container flex items-center justify-center">
        <div className="flex flex-col items-center justify-center max-w-4xl w-full">
          <div className="space-y-2 mb-4 text-center">
            <h1 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
              Welcome to Anki Assistant
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground text-sm">
              Your AI-powered flashcard companion. Create, explore, and master your knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {/* New Chat Card */}
            <Card className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader className="space-y-1 p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquarePlus className="h-4 w-4" />
                  Start a New Chat
                </CardTitle>
                <CardDescription className="text-xs">
                  Begin a conversation with your AI assistant
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button
                  className="w-full"
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push('/chat')}
                >
                  New Chat
                </Button>
              </CardContent>
            </Card>

            {/* Explore Decks Card */}
            <Card className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader className="space-y-1 p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderSearch className="h-4 w-4" />
                  Explore Your Decks
                </CardTitle>
                <CardDescription className="text-xs">
                  Browse and manage your Anki decks
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={handleViewDecks}
                >
                  View Decks
                </Button>
              </CardContent>
            </Card>

            {/* Create New Deck Card */}
            <Card className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader className="space-y-1 p-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderPlus className="h-4 w-4" />
                  Create New Deck
                </CardTitle>
                <CardDescription className="text-xs">
                  Start fresh with a new deck
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <DeckCreationDialogTrigger variant="full"
                    setOpen={setOpen}
                    setShowCloseConfirmation={setShowCloseConfirmation}
                    open={open}
                    showCloseConfirmation={showCloseConfirmation}
                    parentDeck={parentDeck}
                  />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}