import { Button } from "@/components/ui/button";
import { AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { GenerationSteps } from "@/components/dialogs/deck-creation/types";
import { InputStep } from "./user-input";
import { type DeckCreationHook, useDeckCreation } from "@/hooks/use-deck-creation";
import { OutlineEditor } from "./outline-editor";
import { OutlineReview } from "./outline-review";
import { InputHelp } from "./input-help";
import { Loading } from "./loadings";

function LeftContent(
    {
        deckCreationHook
    }:
        {
            deckCreationHook: DeckCreationHook
        }) {
    switch (deckCreationHook.currentStep) {
        case GenerationSteps.INPUT:

            function onSubmit() {
                void deckCreationHook.streamFullOutlineGeneration();
            }

            return <InputStep
                data={deckCreationHook.data}
                onChange={deckCreationHook.updateData}
                onSubmit={onSubmit}
            />
        case GenerationSteps.GENERATING_OUTLINE:
        case GenerationSteps.SAVING_DECK:
            return <Loading
                step={deckCreationHook.currentStep}
                outlineLoadingState={deckCreationHook.currentOutlineLoadingState}
                savingLoadingState={deckCreationHook.currentSavingLoadingState}
                doneCount={deckCreationHook.savedCount}
                totalCount={deckCreationHook.saveTotalCount}
            />
        case GenerationSteps.REVIEWING_OUTLINE:
        case GenerationSteps.REVIEWING_CARDS:
        case GenerationSteps.GENERATING_CARDS:
            return <OutlineEditor
                outlineItem={deckCreationHook.selectedEditorOutlineItem}
                closeEditor={deckCreationHook.closeEditor}
                currentStep={deckCreationHook.currentStep}
                handleGenerateAllCards={deckCreationHook.handleGenerateAllCards}
                handleSaveAllCards={deckCreationHook.handleSaveAllCards}
                updateOutlineItem={deckCreationHook.updateOutlineItem}
                disableSaveAllCards={deckCreationHook.disableSaveAllCards}
                generationStatus={deckCreationHook.generationStatus}
                disableGenerateAllCards={deckCreationHook.disableGenerateAllCards}
            />
        default:
            return null;
    }
}

function RightContent(
    {
        deckCreationHook
    }: {
        deckCreationHook: DeckCreationHook
    }) {
    switch (deckCreationHook.currentStep) {
        case GenerationSteps.INPUT:
            return <InputHelp />
        case GenerationSteps.GENERATING_OUTLINE:
        case GenerationSteps.REVIEWING_OUTLINE:
        case GenerationSteps.REVIEWING_CARDS:
        case GenerationSteps.GENERATING_CARDS:
        case GenerationSteps.SAVING_DECK:
            return <OutlineReview deckCreationHook={deckCreationHook} />
        default:
            return null;
    }
}

export function DeckCreationContent({
    setShowCloseConfirmation,
    setDialogOpen
}: {
    setShowCloseConfirmation: (showCloseConfirmation: boolean) => void,
    setDialogOpen: (dialogOpen: boolean) => void
}) {


    // Main Data
    const deckCreationHook = useDeckCreation({
        setDialogOpen
    });

    // Render
    return (
        <>
            <AlertDialogHeader className="sr-only">
                <AlertDialogTitle>Create New Deck Dialog</AlertDialogTitle>
            </AlertDialogHeader>

            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-50"
                onClick={() => setShowCloseConfirmation(true)}
            >
                <X className="h-4 w-4" />
            </Button>

            <div className="flex h-full overflow-hidden">
                <div className="flex-1 p-2 overflow-y-auto">
                    <LeftContent
                        deckCreationHook={deckCreationHook}
                    />
                </div>
                <Separator orientation="vertical" className="h-full mx-1 mt-8" />
                <div className="flex-1 p-2 overflow-y-auto">
                    <RightContent
                        deckCreationHook={deckCreationHook}
                    />
                </div>
            </div>
        </>
    )
}
