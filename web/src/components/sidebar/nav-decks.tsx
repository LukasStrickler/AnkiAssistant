"use client";

import { AlertDialogContent } from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DeckCreationCloseConfirmation } from "../dialogs/deck-creation/close-confirmation";
import { DeckCreationContent } from "../dialogs/deck-creation/content/content";

import {
  ChevronRight,
  ArrowRightCircle,
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAnkiStore } from "@/stores/anki-store";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { type DeckTreeNode } from "@/lib/anki";
import { ScrollArea } from "../ui/scroll-area";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "../ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { deckToPath } from "@/lib/utils";
import { AlertDialog } from "@/components/ui/alert-dialog";
export function NavDecks() {
  const { decks, refreshDecks, isLoading, collapseAllDecks, expandAllDecks, expandedDecks, highlightDecks, setHighlightDecks } = useAnkiStore();

  useEffect(() => {
    void refreshDecks();
  }, [refreshDecks]);

  useEffect(() => {
    if (highlightDecks) {
      const timer = setTimeout(() => {
        setHighlightDecks(false);
      }, 2000); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [highlightDecks, setHighlightDecks]);

  return (
    <SidebarGroup
      className={cn(
        "flex flex-col h-full group-data-[collapsible=icon]:hidden pt-0",
        highlightDecks && "animate-highlight"
      )}
    >
      <div className="flex justify-between items-center pr-2">
        <SidebarGroupLabel>Decks</SidebarGroupLabel>
        <div className="flex items-center gap-1 pr-1">
          {/* <DeckCreationDialogTrigger /> */}
          {expandedDecks.size > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={collapseAllDecks}
              className="h-8 w-8 rounded-full"
              title="Collapse all decks"
            >
              <ChevronsDownUp className="h-4 w-4" />
              <span className="sr-only">Collapse all decks</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={expandAllDecks}
              className="h-8 w-8 rounded-full"
              title="Expand all decks"
            >
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Expand all decks</span>
            </Button>
          )}
        </div>
      </div>
      <SidebarMenu className="flex-1 min-h-0">
        <ScrollArea className="h-full scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <div className="pr-2" style={{ msOverflowStyle: 'none' }}>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-[4px]">
                  <Skeleton className="h-[24px] w-full rounded-xl" />
                </div>
              ))
            ) : (
              decks.map((deck) => (
                <DeckItem key={deck.name} deck={deck} />
              ))
            )}
          </div>
        </ScrollArea>
      </SidebarMenu>
    </SidebarGroup>
  );
}

function DeckItem({ deck }: { deck: DeckTreeNode }) {
  const { selectDeck, expandedDecks, toggleDeckExpansion } = useAnkiStore();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);



  const [open, setOpen] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);



  // Check if this is the specific deck we want to highlight
  const isSpecificDeck = deck.fullName === "Your Specific Deck Name"; // Replace with your specific deck name

  const truncateDeckName = (name: string, level: number) => {
    const maxLength = 28;
    const indentWidth = 2.5;
    const availableLength = maxLength - level * indentWidth;

    return name.length > availableLength
      ? name.substring(0, Math.max(0, availableLength)) + "..."
      : name;
  };

  return (
    <Collapsible
      open={expandedDecks.has(deck.fullName)}
      onOpenChange={() => toggleDeckExpansion(deck.fullName)}
      asChild
    >





      <SidebarMenuItem
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative"
      >
        <AlertDialog open={open} onOpenChange={setOpen}>

          {isHovered && isSpecificDeck && (
            <div className="absolute z-50 w-6 h-6 bg-red-500" style={{ top: '50%', right: '-20px', transform: 'translateY(-50%)' }} />
          )}
          <div className="flex items-center w-full min-w-fit">
            <HoverCard>
              <HoverCardTrigger asChild>
                <SidebarMenuButton
                  onClick={() => {
                    if (deck.children.length > 0) {
                      toggleDeckExpansion(deck.fullName);
                    } else {
                      selectDeck(deck.name);
                      router.push(deckToPath(deck.fullName));
                    }
                  }}
                  className="flex-1 overflow-hidden whitespace-nowrap rounded-xl"
                >
                  <span className="truncate">
                    {truncateDeckName(
                      deck.name,
                      deck.fullName.split("::").length - 1
                    )}{" "}
                    ({deck.cardCount})
                  </span>
                </SidebarMenuButton>
              </HoverCardTrigger>
              <HoverCardContent
                align="start"
                className="w-[260px] rounded-xl border bg-card p-3 shadow-lg"
                side="right"
              >
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-primary hover:bg-primary/10 rounded-xl min-h-[40px] h-auto py-2"
                      onClick={() => {
                        selectDeck(deck.name);
                        router.push(deckToPath(deck.fullName));
                      }}
                    >
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <span className="break-words whitespace-normal text-left text-balance">
                          {deck.name}
                        </span>
                        <ArrowRightCircle className="h-4 w-4 shrink-0" />
                      </div>
                    </Button>
                  </div>
                  {/* 
                  <DeckCreationDialogTrigger variant="small"
                    parentDeck={deck.fullName}
                    setOpen={setOpen}
                    setShowCloseConfirmation={setShowCloseConfirmation}
                    open={open}
                    showCloseConfirmation={showCloseConfirmation}
                  /> */}

                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between items-center rounded-lg text-xs h-7">
                      <span>Add new card/deck</span>
                      <Plus className="h-3 w-3 shrink-0" />
                    </Button>
                  </AlertDialogTrigger>


                  <div className="rounded-md bg-muted/50 p-2">
                    {deck.fullName.split("::").map((part, index) => (
                      <div key={index} className="flex">
                        {index > 0 && (
                          <ChevronRight className="mr-1 h-3 w-3 shrink-0 opacity-50" />
                        )}
                        <span className="text-xs font-mono text-foreground/80 break-words ">
                          {part.trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>





          {deck.children.length > 0 && (
            <>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="transition-transform data-[state=open]:rotate-90 shrink-0 translate-x-[-8px]">
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="relative">
                  <div
                    className="absolute left-3 top-0 bottom-0 w-[2px] bg-gray-600 rounded-xl"
                    aria-hidden="true"
                  />
                  <ul className="ml-4 min-w-fit">
                    {deck.children.map((child) => (
                      <DeckItem key={child.name} deck={child} />
                    ))}
                  </ul>
                </div>
              </CollapsibleContent>
            </>
          )}

          <AlertDialogContent
            className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] py-4 px-4 absolute"
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              setShowCloseConfirmation(true);
            }}
          >
            <DeckCreationContent
              setShowCloseConfirmation={setShowCloseConfirmation}
              setDialogOpen={setOpen}
              parentDeck={deck}
            />
          </AlertDialogContent>

          <DeckCreationCloseConfirmation
            showCloseConfirmation={showCloseConfirmation}
            setShowCloseConfirmation={setShowCloseConfirmation}
            handleClose={() => setOpen(false)}
          />
        </AlertDialog>
      </SidebarMenuItem>
    </Collapsible>
  );
}

