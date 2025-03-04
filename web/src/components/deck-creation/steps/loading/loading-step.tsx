import { MultiStepLoader } from "../../multi-step-loader";

interface LoadingState {
    text: string;
}

interface LoadingStepProps {
    title: string;
    loadingStates: LoadingState[];
    currentStep: number;
}

export function LoadingStep({ title, loadingStates, currentStep }: LoadingStepProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-8">{title}</h2>
            <div className="w-full max-w-md">
                {/* <MultiStepLoader
                    loadingStates={loadingStates}
                    loading={true}
                    duration={1000}
                /> */}
            </div>
        </div>
    );
} 