import { AlertDialogContent } from "@/components/ui/alert-dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DeckCreationCloseConfirmation } from "./close-confirmation";
import { DeckCreationContent } from "./content/content";
import { type DeckTreeNode } from "@/lib/anki";
interface DeckCreationDialogTriggerProps {
    variant?: 'icon' | 'full' | 'small';
    parentDeck?: DeckTreeNode;
    className?: string;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    setOpen: (open: boolean) => void;
    setShowCloseConfirmation: (showCloseConfirmation: boolean) => void;
    open: boolean;
    showCloseConfirmation: boolean;
}

export function DeckCreationDialogTrigger({
    variant = 'icon',
    parentDeck,
    className,
    size = 'icon',
    setOpen,
    setShowCloseConfirmation,
    open,
    showCloseConfirmation
}: DeckCreationDialogTriggerProps) {

    // const [open, setOpen] = useState(false);
    // const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen} >
                <AlertDialogTrigger asChild>
                    {(() => {
                        switch (variant) {
                            case 'icon':
                                return (
                                    <Button
                                        variant="ghost"
                                        size={size}
                                        className={`${size === 'icon' ? 'h-8 w-8' : ''} rounded-full ${className ?? ''}`}
                                        title={parentDeck ? `Create subdeck in ${parentDeck.name}` : "Create new deck"}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="sr-only">{parentDeck ? `Create subdeck in ${parentDeck.name}` : "Create new deck"}</span>
                                    </Button>
                                );
                            case 'small':
                                return (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`w-full justify-between items-center rounded-lg text-xs h-7 ${className ?? ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span>Add new card/deck</span>
                                        <Plus className="h-3 w-3 shrink-0" />
                                    </Button>
                                );
                            case 'full':
                            default:
                                return (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className={`w-full gap-2 ${className ?? ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Add new card/deck
                                    </Button>
                                );
                        }
                    })()}
                </AlertDialogTrigger>
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
                        parentDeck={parentDeck}
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


