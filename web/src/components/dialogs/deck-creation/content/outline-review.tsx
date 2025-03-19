import { OutlineItem, GenerationSteps, GenerationStep } from "@/components/dialogs/deck-creation/types";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DeckCreationHook } from "@/hooks/use-deck-creation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';
import { Separator } from "@/components/ui/separator";
import { DeckSelector } from "@/components/selectors/deck-selector";
import { useState } from "react";
import { convertMarkdownToAnkiHTML } from "@/lib/anki";
function OutlineItemCard(
    {
        outlineItem,
    }: {
        outlineItem: OutlineItem,
    }
) {
    if (!outlineItem.card) {
        return null;
    }

    return (
        <Card className="mt-4 bg-muted/30">
            <CardContent className="p-4">
                <div className="text-sm rounded-md p-2">
                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: convertMarkdownToAnkiHTML(outlineItem.card.front) }}>
                        {/* <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                p: ({ node, ...props }) => <p style={{ whiteSpace: 'pre-line' }} {...props} />
                            }}>
                            {outlineItem.card.front}
                        </ReactMarkdown> */}
                    </div>
                </div>
                <Separator className="my-2 bg-secondary-foreground/50 rounded-xl p-[1.5px]" />
                <div className="text-sm rounded-md p-2">
                    <div className="markdown-content" style={{ marginBottom: "0px" }} dangerouslySetInnerHTML={{ __html: convertMarkdownToAnkiHTML(outlineItem.card.back) }}>
                        {/* <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                p: ({ node, ...props }) => <p style={{ whiteSpace: 'pre-line' }} {...props} />
                            }}>
                            {outlineItem.card.back}
                        </ReactMarkdown> */}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function OutlineItemAccordion(
    {
        outlineItem,
        setEditor,
        handleRegenerateCard,
        currentStep,
        handleUpdateItemDeck
    }: {
        outlineItem: OutlineItem,
        setEditor: (outlineItem: OutlineItem) => void,
        handleRegenerateCard: (outlineItem: OutlineItem) => void,
        currentStep: GenerationStep,
        handleUpdateItemDeck: (outlineItem: OutlineItem, newDeck: string) => void
    }
) {
    const disableRegenerateCard = outlineItem.status === "pending" || outlineItem.status === "generating";

    const disableEditCard = outlineItem.status === "pending" ||
        outlineItem.status === "generating" ||
        (currentStep !== GenerationSteps.REVIEWING_OUTLINE && currentStep !== GenerationSteps.REVIEWING_CARDS);


    return (
        <div className="space-y-4">
            {/* Deck Selector Section */}
            <div className="space-y-2">
                <DeckSelector
                    value={outlineItem.deck}
                    onChange={(newDeck: string) => handleUpdateItemDeck(outlineItem, newDeck)}
                    placeholder="Select or enter deck name"
                />
            </div>

            {/* Content Section */}
            <div className="space-y-1">
                {/* <span className="text-muted-foreground">
                    {outlineItem.deck}
                </span> */}

                <div className="flex flex-col gap-1.5">
                    <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                        <div className="markdown-content">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ node, ...props }) => <p style={{ whiteSpace: 'pre-line' }} {...props} />
                                }}>
                                {outlineItem.key_points}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Section if available */}
            {outlineItem.card && (
                <div className="mt-0">
                    <OutlineItemCard
                        outlineItem={outlineItem}
                    />
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-3">
                <Button
                    onClick={() => setEditor(outlineItem)}
                    variant="default"
                    size="sm"
                    // disabled={!(currentStep === GenerationSteps.REVIEWING_OUTLINE
                    //     || currentStep === GenerationSteps.REVIEWING_CARDS
                    //     || outlineItem.status === "pending" || outlineItem.status === "generating")}

                    // disable if where are pending or generating this card
                    disabled={disableEditCard}
                >
                    Edit Item
                </Button>
                <Button
                    onClick={() => handleRegenerateCard(outlineItem)}
                    variant="default"
                    size="sm"
                    disabled={disableRegenerateCard || !outlineItem.card}
                >
                    Regenerate Card
                </Button>
            </div>
        </div>
    )
}

function OutlineItemView({
    outlineItem,
    setEditor,
    selectedEditorOutlineItem,
    handleRegenerateCard,
    currentStep,
    handleUpdateItemDeck
}: {
    outlineItem: OutlineItem,
    setEditor: (outlineItem: OutlineItem) => void,
    selectedEditorOutlineItem: OutlineItem | null,
    handleRegenerateCard: (outlineItem: OutlineItem) => void,
    currentStep: GenerationStep,
    handleUpdateItemDeck: (outlineItem: OutlineItem, newDeck: string) => void
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
                    <div className="flex flex-wrap text-left text-sm text-muted-foreground">
                        <span>{outlineItem.status && getStatusText(outlineItem.status)}</span>
                        <span className="mx-1">•</span>
                        <span>{outlineItem.card_type}</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 rounded-lg">
                <OutlineItemAccordion
                    outlineItem={outlineItem}
                    setEditor={setEditor}
                    handleRegenerateCard={handleRegenerateCard}
                    currentStep={currentStep}
                    handleUpdateItemDeck={handleUpdateItemDeck}
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
        currentStep,
        handleUpdateItemDeck
    }: {
        outlineItems: OutlineItem[],
        setEditor: (outlineItem: OutlineItem) => void,
        selectedEditorOutlineItem: OutlineItem | null,
        handleRegenerateCard: (outlineItem: OutlineItem) => void,
        currentStep: GenerationStep,
        handleUpdateItemDeck: (outlineItem: OutlineItem, newDeck: string) => void
    }
) {
    // State to track which items are open by their ID
    const [openItems, setOpenItems] = useState<string[]>([]);

    const groupOutlineItemsByDeck = () => {
        return outlineItems.reduce((acc, item) => {
            acc[item.deck] = [...(acc[item.deck] || []), item];
            return acc;
        }, {} as Record<string, OutlineItem[]>);
    }

    return (
        <div className="w-full h-full bg-zinc-900/70 rounded-lg overflow-hidden">
            <ScrollArea className="w-full h-full p-2">
                {/* {JSON.stringify(groupOutlineItemsByDeck())} */}
                {Object.keys(groupOutlineItemsByDeck()).map((deck) => (
                    <div key={deck}>
                        <h2 className="text-lg font-bold px-2 py-1">{deck}</h2>
                        <Accordion
                            type="multiple"
                            className="w-full space-y-4 rounded-lg"
                            value={openItems}
                            onValueChange={setOpenItems}
                        >
                            {groupOutlineItemsByDeck()[deck]?.map(item => (
                                <OutlineItemView
                                    key={item.id}
                                    outlineItem={item}
                                    setEditor={setEditor}
                                    selectedEditorOutlineItem={selectedEditorOutlineItem}
                                    handleRegenerateCard={handleRegenerateCard}
                                    currentStep={currentStep}
                                    handleUpdateItemDeck={handleUpdateItemDeck}
                                />
                            ))}
                        </Accordion>
                    </div>
                ))}
            </ScrollArea>
        </div>
    )
}

export function OutlineReview({ deckCreationHook }: { deckCreationHook: DeckCreationHook }) {
    const outlineItems = deckCreationHook.data.outline;

    const handleRegenerateCompleteOutline = () => {
        deckCreationHook.streamFullOutlineGeneration();
    }

    const handleRegenerateCard = (outlineItem: OutlineItem) => {
        // deckCreationHook.streamFullOutlineGeneration();
        console.log("Regenerate Card", outlineItem);
        deckCreationHook.handleGenerateCard(outlineItem, 1);
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
                    handleUpdateItemDeck={deckCreationHook.handleUpdateItemDeck}
                />
            </div>
        </div>
    )
}