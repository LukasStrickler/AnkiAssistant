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
import { type OutlineItem } from "./types";
import { type Card as FlashCard } from "./types";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface OutlineWithCardsProps {
    outline: OutlineItem[];
    onOutlineItemClick?: (item: OutlineItem) => void;
    onRegenerateCard?: (outlineItem: OutlineItem) => void;
    onEditCard?: (card: FlashCard) => void;
    selectedOutlineId?: number;
}

export function OutlineWithCards({
    outline,
    onOutlineItemClick,
    onRegenerateCard,
    onEditCard,
    selectedOutlineId
}: OutlineWithCardsProps) {
    const [openItems, setOpenItems] = useState<string[]>([]);

    const handleAccordionChange = (value: string[]) => {
        setOpenItems(value);
    };

    return (
        <Accordion
            type="multiple"
            className="w-full space-y-4"
            value={openItems}
            onValueChange={handleAccordionChange}
        >
            {outline.map((item) => (
                <AccordionItem
                    key={item.id}
                    value={String(item.id)}
                    className={cn(
                        "border rounded-lg transition-colors",
                        selectedOutlineId === item.id && "border-primary",
                        item.status === "error" && "border-destructive"
                    )}
                >
                    <AccordionTrigger
                        className="px-4 hover:no-underline"
                        onClick={() => onOutlineItemClick?.(item)}
                    >
                        <div className="flex flex-col items-start text-left">
                            <div className="font-semibold">{item.concept}</div>
                            <div className="text-sm text-muted-foreground">
                                {item.card_type} • {item.status}
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                {item.key_points}
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
                                    {(onRegenerateCard || onEditCard) && (
                                        <CardFooter className="gap-2 justify-end">
                                            {onRegenerateCard && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onRegenerateCard(item)}
                                                    className="gap-2"
                                                >
                                                    <RefreshCw className="h-3 w-3" />
                                                    Regenerate
                                                </Button>
                                            )}
                                            {onEditCard && item.card && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => onEditCard(item.card!)}
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
    );
} 