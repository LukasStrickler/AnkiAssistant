import { OutlineItem, GenerationSteps, GenerationStep } from "@/components/dialogs/deck-creation/types";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DeckCreationHook, EditorMode } from "@/hooks/use-deck-creation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function OutlineItemCard(
    {
        outlineItem,
        setEditor,
        handleRegenerateCard,
    }: {
        outlineItem: OutlineItem,
        setEditor: (outlineItem: OutlineItem, editorMode: EditorMode) => void,
        handleRegenerateCard: (outlineItem: OutlineItem) => void,
    }
) {
    if (!outlineItem.card) {
        return null;
    }

    const disableEditCard = outlineItem.status === "pending" || outlineItem.status === "generating";
    return (
        <Card className="mt-4 bg-muted/30">
            <CardContent className="p-4 space-y-2">
                <div className="font-medium">Front:</div>
                <div className="text-sm rounded bg-background p-2">{outlineItem.card.front}</div>
                <div className="font-medium mt-2">Back:</div>
                <div className="text-sm rounded bg-background p-2">{outlineItem.card.back}</div>
                <Button
                    onClick={() => setEditor(outlineItem, EditorMode.CARD)}
                    variant="outline"
                    size="sm"
                    disabled={disableEditCard}
                >
                    Edit Card
                </Button>
                <Button
                    onClick={() => handleRegenerateCard(outlineItem)}
                    variant="outline"
                    size="sm"
                >
                    Regenerate Card
                </Button>
            </CardContent>
        </Card>
    )
}

function OutlineItemAccordion(
    {
        outlineItem,
        setEditor,
        handleRegenerateCard,
        currentStep
    }: {
        outlineItem: OutlineItem,
        setEditor: (outlineItem: OutlineItem, editorMode: EditorMode) => void,
        handleRegenerateCard: (outlineItem: OutlineItem) => void,
        currentStep: GenerationStep
    }
) {
    return (
        <div className="space-y-4">
            {/* Content Section */}
            <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md whitespace-pre-line">{outlineItem.key_points}</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-3">
                <Button
                    onClick={() => setEditor(outlineItem, EditorMode.OUTLINE)}
                    variant="default"
                    size="sm"
                    disabled={!(currentStep === GenerationSteps.REVIEWING_OUTLINE
                        || currentStep === GenerationSteps.REVIEWING_CARDS
                        || outlineItem.status === "pending" || outlineItem.status === "generating")}
                >
                    Edit Item
                </Button>
            </div>

            {/* Card Section if available */}
            {outlineItem.card && (
                <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium text-sm mb-2">Card Preview:</h3>
                    <OutlineItemCard
                        outlineItem={outlineItem}
                        setEditor={setEditor}
                        handleRegenerateCard={handleRegenerateCard}
                    />
                </div>
            )}
        </div>
    )
}

function OutlineItemView({
    outlineItem,
    setEditor,
    selectedEditorOutlineItem,
    handleRegenerateCard,
    currentStep
}: {
    outlineItem: OutlineItem,
    setEditor: (outlineItem: OutlineItem, editorMode: EditorMode) => void,
    selectedEditorOutlineItem: OutlineItem | null,
    handleRegenerateCard: (outlineItem: OutlineItem) => void,
    currentStep: GenerationStep
}) {

    const getStatusText = (status: string) => {
        return status.replace(/-/g, " ").replace(/\b\w/g, char => char.toUpperCase());
    };
    return (
        <AccordionItem
            key={outlineItem.id}
            value={outlineItem.id.toString()}
            className={cn(
                "border rounded-lg transition-colors bg-background",
                outlineItem.status === "error" && "border-destructive",
                outlineItem.status === "generating" && "border-yellow-500",
                outlineItem.status === "pending" && "border-gray-500",
                selectedEditorOutlineItem?.id === outlineItem.id && "border-blue-500"
            )}
        >
            <AccordionTrigger className="px-4 hover:no-underline rounded-lg">
                <div className="flex flex-col w-full">
                    <div className="font-semibold text-left">{outlineItem.concept}</div>
                    <div className="flex flex-row text-left">
                        <div className="text-sm text-muted-foreground">
                            {outlineItem.status && getStatusText(outlineItem.status)}
                        </div>
                        <span className="text-sm text-muted-foreground mx-1">•</span>
                        <div className="text-sm text-muted-foreground">
                            {outlineItem.card_type}
                        </div>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 rounded-lg">
                <OutlineItemAccordion
                    outlineItem={outlineItem}
                    setEditor={setEditor}
                    handleRegenerateCard={handleRegenerateCard}
                    currentStep={currentStep}
                />
            </AccordionContent>
        </AccordionItem>
    );
}

function OutlineSection(
    {
        outlineItems,
        setEditor,
        selectedEditorOutlineItem,
        handleRegenerateCard,
        currentStep
    }: {
        outlineItems: OutlineItem[],
        setEditor: (outlineItem: OutlineItem, editorMode: EditorMode) => void,
        selectedEditorOutlineItem: OutlineItem | null,
        handleRegenerateCard: (outlineItem: OutlineItem) => void,
        currentStep: GenerationStep
    }
) {


    return (
        <ScrollArea className="w-full h-full bg-zinc-900/70 rounded-lg p-2">
            <Accordion
                type="multiple"
                className="w-full space-y-4 rounded-lg"
            >
                {outlineItems.map(item => (
                    <OutlineItemView
                        key={item.id}
                        outlineItem={item}
                        setEditor={setEditor}
                        selectedEditorOutlineItem={selectedEditorOutlineItem}
                        handleRegenerateCard={handleRegenerateCard}
                        currentStep={currentStep}
                    />
                ))}
            </Accordion>
        </ScrollArea>
    )
}

export function OutlineReview({ deckCreationHook }: { deckCreationHook: DeckCreationHook }) {
    const outlineItems = deckCreationHook.data.outline;

    const handleRegenerateCompleteOutline = () => {
        deckCreationHook.streamFullOutlineGeneration();
    }

    const handleRegenerateCard = (outlineItem: OutlineItem) => {
        // deckCreationHook.streamFullOutlineGeneration();
    }

    const handleRegenerateAllCards = () => {
        deckCreationHook.handleGenerateAllCards();
    }


    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Outline Review</h1>
                <div className="flex flex-col sm:flex-row gap-2 pr-8">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center justify-center"
                        onClick={handleRegenerateAllCards}
                        disabled={deckCreationHook.currentStep !== GenerationSteps.REVIEWING_CARDS}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span>Regenerate All Cards</span>
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center justify-center"
                        disabled={!(deckCreationHook.currentStep === GenerationSteps.REVIEWING_OUTLINE || deckCreationHook.currentStep === GenerationSteps.REVIEWING_CARDS)}
                        onClick={handleRegenerateCompleteOutline}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span>Regenerate Outline</span>
                    </Button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <OutlineSection
                    outlineItems={outlineItems}
                    setEditor={deckCreationHook.setEditor}
                    selectedEditorOutlineItem={deckCreationHook.selectedEditorOutlineItem}
                    handleRegenerateCard={handleRegenerateCard}
                    currentStep={deckCreationHook.currentStep}
                />
            </div>
        </div>
    )
}