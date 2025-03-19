import { type GenerationStep, GenerationSteps, OutlineLoadingState, OutlineLoadingStates, SavingLoadingState, SavingLoadingStates } from "../types";
import { Loader2 } from "lucide-react";

interface LoadingProps {
    step: GenerationStep;
    outlineLoadingState?: OutlineLoadingState;
    savingLoadingState?: SavingLoadingState;
    doneCount: number;
    totalCount: number;
}

export function Loading({
    step,
    outlineLoadingState,
    savingLoadingState,
    doneCount = 0,
    totalCount = 0 }:
    LoadingProps) {
    const getLoadingStates = () => {
        switch (step) {
            case GenerationSteps.GENERATING_OUTLINE:
                return Object.values(OutlineLoadingStates).map((text, id) => ({
                    id,
                    text
                }));
            case GenerationSteps.SAVING_DECK:
                return Object.values(SavingLoadingStates).map((text, id) => ({
                    id,
                    text: text.replace('{current}', String(doneCount))
                        .replace('{total}', String(totalCount))
                }));
            default:
                return [];
        }
    };

    const loadingStates = getLoadingStates();
    const currentIndex = step === GenerationSteps.GENERATING_OUTLINE && outlineLoadingState
        ? Object.values(OutlineLoadingStates).indexOf(outlineLoadingState)
        : step === GenerationSteps.SAVING_DECK && savingLoadingState
            ? Object.values(SavingLoadingStates).indexOf(savingLoadingState)
            : 0;

    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
                <div className="flex flex-col gap-4">
                    {loadingStates.map((state, index) => (
                        <div
                            key={state.id}
                            className={`flex items-center gap-2 ${index === currentIndex ? "opacity-100" :
                                index < currentIndex ? "opacity-75" : "opacity-50"
                                }`}
                        >
                            <div className={`w-2 h-2 ${index < currentIndex ? "bg-green-500" :
                                index === currentIndex ? "bg-blue-500" :
                                    "bg-gray-300"
                                } rounded-full`}></div>
                            <div className="text-sm text-gray-500">{state.text}</div>
                            {index === currentIndex && (
                                <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-500" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
