import { AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { AlertDialog } from "@/components/ui/alert-dialog";

import { AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export function DeckCreationCloseConfirmation({ showCloseConfirmation, setShowCloseConfirmation, handleClose }: { showCloseConfirmation: boolean, setShowCloseConfirmation: (showCloseConfirmation: boolean) => void, handleClose: () => void }) {
    return (
        <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
            <AlertDialogContent className="max-w-[400px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-semibold">Close Deck Creation?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                        Any unsaved progress will be lost. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="min-w-[100px]">
                        Keep Editing
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleClose}
                        className="min-w-[100px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Close Dialog
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}