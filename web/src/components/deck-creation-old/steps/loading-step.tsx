// import { MultiStepLoader } from "../../multi-step-loader";
import { type LoadingStateConfig } from "./types";

interface LoadingState {
    text: string;
}

interface LoadingStepProps {
    title: string;
    loadingStates: LoadingState[];
    currentStep: number;
}

// New LoadingStep component with enhanced functionality
export function LoadingStep({ title, loadingStates, currentStep }: LoadingStepProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-8">{title}</h2>
            <div className="w-full max-w-md">
                <div className="flex flex-col gap-4">
                    {loadingStates.map((state, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-2 ${index === currentStep ? "opacity-100" : "opacity-50"}`}
                        >
                            <div className={`w-2 h-2 ${index === currentStep ? "bg-blue-500" : "bg-gray-300"} rounded-full`}></div>
                            <div className="text-sm text-gray-500">{state.text}</div>
                        </div>
                    ))}
                </div>
                {/* <MultiStepLoader
                    loadingStates={loadingStates}
                    loading={true}
                    duration={1000}
                /> */}
            </div>
        </div>
    );
}

// New enhanced LoadingStep that works with dynamic loading states
interface EnhancedLoadingStepProps {
    title: string;
    loadingConfig: LoadingStateConfig;
}

export function EnhancedLoadingStep({ title, loadingConfig }: EnhancedLoadingStepProps) {
    // Filter out conditional items that aren't needed
    const displayedStates = loadingConfig.items.filter(item => !item.conditional || loadingConfig.currentId === item.id);

    // Process replacement parameters in text
    const processedStates = displayedStates.map(item => {
        let processedText = item.text;

        if (item.replacementParams) {
            Object.entries(item.replacementParams).forEach(([key, value]) => {
                processedText = processedText.replace(`{${key}}`, String(value));
            });
        }

        return {
            ...item,
            text: processedText
        };
    });

    // Find the index of the current step
    const currentIndex = processedStates.findIndex(item => item.id === loadingConfig.currentId);

    return (
        <div className="h-full flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-8">{title}</h2>
            <div className="w-full max-w-md">
                <div className="flex flex-col gap-4">
                    {processedStates.map((state, index) => (
                        <div
                            key={state.id}
                            className={`flex items-center gap-2 ${index === currentIndex ? "opacity-100" : index < currentIndex ? "opacity-75" : "opacity-50"}`}
                        >
                            <div className={`w-2 h-2 ${index < currentIndex ? "bg-green-500" :
                                index === currentIndex ? "bg-blue-500" :
                                    "bg-gray-300"
                                } rounded-full`}></div>
                            <div className="text-sm text-gray-500">{state.text}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Compact loading indicator for displaying in a smaller space
interface CompactLoadingIndicatorProps {
    loadingConfig: LoadingStateConfig;
}

export function CompactLoadingIndicator({ loadingConfig }: CompactLoadingIndicatorProps) {
    // Get the current loading state
    const currentState = loadingConfig.currentId
        ? loadingConfig.items.find(item => item.id === loadingConfig.currentId)
        : null;

    if (!currentState) return null;

    // Process replacement parameters in text
    let processedText = currentState.text;
    if (currentState.replacementParams) {
        Object.entries(currentState.replacementParams).forEach(([key, value]) => {
            // limit to 100 characters
            processedText = processedText.replace(`{${key}}`, String(value).slice(0, 30))
        });
    }

    return (
        <div className="p-2 bg-background border rounded-md shadow-sm w-full">
            <div className="flex items-center space-x-3 w-full">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <div className="text-sm text-foreground">{processedText}</div>
            </div>
        </div>
    );
} 