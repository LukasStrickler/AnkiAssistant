import { Button } from "@/components/ui/button";
import { type CardsStepProps } from "../types";
import { cn } from "@/lib/utils";

export function CardsStepLeft({ cards, onRegenerateCard, onNext }: CardsStepProps) {
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Review Cards</h2>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto mb-4">
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className={cn(
                                "border rounded-lg p-4 mb-4 transition-all duration-300",
                                card.status === 'pending' && "opacity-50",
                                card.status === 'generating' && "border-green-500",
                                card.status === 'complete' && "border-blue-500"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-4 flex-grow">
                                    <div>
                                        <div className="font-semibold mb-2">Front</div>
                                        <div className="p-2 bg-muted rounded">{card.front}</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold mb-2">Back</div>
                                        <div className="p-2 bg-muted rounded">{card.back}</div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRegenerateCard(card.id)}
                                    disabled={card.status === 'generating'}
                                >
                                    Regenerate
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <Button
                    onClick={onNext}
                    className="w-full"
                    disabled={cards.some(card => card.status !== 'complete')}
                >
                    Save to Anki
                </Button>
            </div>
        </div>
    );
} 