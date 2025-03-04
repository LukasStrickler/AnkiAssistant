import { Button } from "@/components/ui/button";
import { type OutlineStepProps } from "../types";

export function OutlineStepLeft({ outline, onRegenerateOutline, onNext }: OutlineStepProps) {
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Review Outline</h2>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto mb-4 space-y-2">
                    {outline.map((section, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                            {section}
                        </div>
                    ))}
                </div>
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={onRegenerateOutline}
                        className="flex-1"
                    >
                        Regenerate Outline
                    </Button>
                    <Button
                        onClick={onNext}
                        className="flex-1"
                    >
                        Generate Cards
                    </Button>
                </div>
            </div>
        </div>
    );
} 