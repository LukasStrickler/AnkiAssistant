import { GenerationSteps, GenerationStep, OutlineItem } from "@/components/dialogs/deck-creation/types";
import { EditorMode } from "@/hooks/use-deck-creation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function OutlineNavigator({
    currentStep,
    handleGenerateAllCards,
    handleSaveAllCards,
    disableSaveAllCards,
    generationStatus
}: {
    currentStep: GenerationStep,
    handleGenerateAllCards: () => void,
    handleSaveAllCards: () => void,
    disableSaveAllCards: boolean,
    generationStatus: string
}) {
    return (
        <div className="w-full mt-auto pt-4 border-t">
            {currentStep === GenerationSteps.REVIEWING_OUTLINE && (
                <Button
                    onClick={handleGenerateAllCards}
                    className="w-full"
                    variant="default"
                >Generate All Cards</Button>
            )}
            {currentStep === GenerationSteps.REVIEWING_CARDS && (
                <Button
                    onClick={handleSaveAllCards}
                    className="w-full"
                    variant="default"
                    disabled={disableSaveAllCards}
                >Save All Cards</Button>
            )}
            {currentStep === GenerationSteps.GENERATING_CARDS && (
                <div className="w-full bg-muted rounded-lg p-4 flex flex-col items-center justify-center h-9">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground text-center">
                            {generationStatus || "AI is creating your flashcards..."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function OutlineItemEditor(
    {
        outlineItem,
        onChange
    }: {
        outlineItem: OutlineItem | null,
        onChange: (outlineItem: OutlineItem) => void
    }) {
    return (
        <div>
            {JSON.stringify(outlineItem, null, 2)}
        </div>

    )
}

export function OutlineEditor(
    {
        outlineItem,
        closeEditor,
        currentStep,
        handleGenerateAllCards,
        handleSaveAllCards,
        disableSaveAllCards,
        updateOutlineItem,
        generationStatus
    }: {
        outlineItem: OutlineItem | null,
        closeEditor: () => void,
        currentStep: GenerationStep,
        handleGenerateAllCards: () => void,
        handleSaveAllCards: () => void,
        disableSaveAllCards: boolean,
        updateOutlineItem: (outlineItem: OutlineItem) => void,
        generationStatus: string
    }) {

    if (!outlineItem) {
        return (
            <div className="flex flex-col h-full">
                <div className="">
                    <h1 className="text-2xl font-bold">Outline Editor</h1>
                </div>
                <div className="flex-grow flex items-center justify-center p-6">
                    <p className="text-muted-foreground text-center">Please select an outline item to edit</p>
                </div>
                <div className="p-6">
                    <OutlineNavigator
                        currentStep={currentStep}
                        handleGenerateAllCards={handleGenerateAllCards}
                        handleSaveAllCards={handleSaveAllCards}
                        disableSaveAllCards={disableSaveAllCards}
                        generationStatus={generationStatus}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Outline Editor</h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={closeEditor}
                            variant="ghost"
                            size="sm"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex-grow overflow-auto p-6">
                <div className="space-y-6">
                    <OutlineItemEditor
                        outlineItem={outlineItem}
                        onChange={updateOutlineItem}
                    />

                </div>
            </div>
            <div className="p-6">
                <OutlineNavigator
                    currentStep={currentStep}
                    handleGenerateAllCards={handleGenerateAllCards}
                    handleSaveAllCards={handleSaveAllCards}
                    disableSaveAllCards={disableSaveAllCards}
                    generationStatus={generationStatus}
                />
            </div>
        </div>
    );
}