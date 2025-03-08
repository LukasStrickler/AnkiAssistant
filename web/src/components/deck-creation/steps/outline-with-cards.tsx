"use client";

import { useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type OutlineItem } from "./types";
import { type Card as FlashCard } from "./types";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useNoteVariantStore } from "@/stores/note-variant-store";

interface OutlineWithCardsProps {
    outline: OutlineItem[];
    onOutlineItemClick?: (item: OutlineItem) => void;
    onRegenerateCard?: (outlineItem: OutlineItem) => void;
    onEditCard?: (card: FlashCard) => void;
    onEditOutline?: (outlineItem: OutlineItem) => void;
    selectedOutlineId?: number;
}

export function OutlineWithCards({
    outline,
    onOutlineItemClick,
    onRegenerateCard,
    onEditCard,
    onEditOutline,
    selectedOutlineId
}: OutlineWithCardsProps) {
    const [openItems, setOpenItems] = useState<string[]>([]);
    const noteVariants = useNoteVariantStore((state) => state.variants);

    const handleAccordionChange = (value: string[]) => {
        setOpenItems(value);
    };

    // Helper function to get the display name for a card type ID
    const getCardTypeDisplayName = (cardTypeId: string) => {
        const variant = noteVariants.find(v => v.id === cardTypeId);
        if (variant) return variant.name;

        // Fallback - if we can't find it, return the original value (might be a name already)
        return cardTypeId;
    };

    const getStatusText = (status: string) => {
        return status.replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
    };

    const anyOutlineItemsPending = outline.some(item => item.status === "pending" || item.status === "generating");

    return (
        <ScrollArea className="w-full h-full bg-zinc-900/70 rounded-lg p-2">
            <Accordion
                type="multiple"
                className="w-full space-y-4 rounded-lg"
                value={openItems}
                onValueChange={handleAccordionChange}
            >
                {outline.map((item) => (
                    <AccordionItem
                        key={item.id}
                        value={String(item.id)}
                        className={cn(
                            "border rounded-lg transition-colors bg-background",
                            selectedOutlineId === item.id && "border-primary",
                            item.status === "error" && "border-destructive",
                            item.status === "generating" && "border-yellow-500",
                            item.status === "pending" && "border-gray-500"

                        )}
                    >
                        <AccordionTrigger
                            className="px-4 hover:no-underline rounded-lg"
                            onClick={() => onOutlineItemClick?.(item)}
                        >
                            <div className="flex flex-col items-start text-left">
                                <div className="font-semibold">{item.concept}</div>
                                <div className="text-sm text-muted-foreground">
                                    {getCardTypeDisplayName(item.card_type)} • {getStatusText(item.status)}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 rounded-lg">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    {item.key_points}
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    {onEditOutline && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onEditOutline(item)}
                                            disabled={item.status === "generating" || item.status === "pending"}
                                            className="rounded-lg"
                                        >
                                            Edit Outline
                                        </Button>
                                    )}
                                </div>
                                {item.card && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Generated Card</CardTitle>
                                            <CardDescription>
                                                Review and edit the generated flashcard
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <div className="font-medium mb-1">Front</div>
                                                <div className="p-3 bg-muted rounded-md text-sm">
                                                    {item.card.front}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-medium mb-1">Back</div>
                                                <div className="p-3 bg-muted rounded-md text-sm">
                                                    {item.card.back}
                                                </div>
                                            </div>
                                        </CardContent>
                                        {(onRegenerateCard ?? onEditCard) && (
                                            <CardFooter className="gap-2 justify-end rounded-lg">
                                                {onRegenerateCard && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onRegenerateCard(item)}
                                                        className="gap-2 rounded-lg"
                                                        disabled={anyOutlineItemsPending}
                                                    >
                                                        <RefreshCw className="h-3 w-3" />
                                                        Regenerate
                                                    </Button>
                                                )}
                                                {onEditCard && item.card && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => onEditCard(item.card!)}
                                                        disabled={item.status === "generating"}
                                                        className="rounded-lg"
                                                    >
                                                        Edit Card
                                                    </Button>
                                                )}
                                            </CardFooter>
                                        )}
                                    </Card>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </ScrollArea>
    );
} 