import { usePromptStore } from "@/stores/prompt-store";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SystemPromptSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function SystemPromptSelector({ value, onChange }: SystemPromptSelectorProps) {
    const prompts = usePromptStore((state) => state.prompts);
    const selectedPrompt = usePromptStore((state) => state.getSelectedPrompt());

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue>
                        <div className="flex items-center">
                            <div>
                                <div className="font-medium">{selectedPrompt?.name}</div>
                            </div>
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {prompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                            <div className="flex items-center">
                                <div>
                                    <div className="font-medium">{prompt.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {prompt.description}
                                    </div>
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
} 