import { AlertDialogContent } from "@/components/ui/alert-dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DeckCreationCloseConfirmation } from "./close-confirmation";
import { DeckCreationContent } from "./content/content";

interface DeckCreationDialogTriggerProps {
    variant?: 'icon' | 'full';
}

export function DeckCreationDialogTrigger({ variant = 'icon' }: DeckCreationDialogTriggerProps) {
    const [open, setOpen] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    {variant === 'icon' ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            title="Create new deck"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Create new deck</span>
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full gap-2"
                        >
                            Create new deck
                        </Button>
                    )}
                </AlertDialogTrigger>
                <AlertDialogContent
                    className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] py-4 px-4"
                    onEscapeKeyDown={(e) => {
                        e.preventDefault();
                        setShowCloseConfirmation(true);
                    }}
                >
                    <DeckCreationContent
                        setShowCloseConfirmation={setShowCloseConfirmation}
                        setDialogOpen={setOpen}
                    />
                </AlertDialogContent>
            </AlertDialog>

            <DeckCreationCloseConfirmation
                showCloseConfirmation={showCloseConfirmation}
                setShowCloseConfirmation={setShowCloseConfirmation}
                handleClose={() => setOpen(false)}
            />
        </>
    )
}
