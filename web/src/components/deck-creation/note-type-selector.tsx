import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useNoteTypeStore, type NoteTypeState } from "@/stores/note-type-store";

interface NoteTypeSelectorProps {
    value: string[];
    onChange: (value: string[]) => void;
}

const ScrollableContent = ({ children }: { children: React.ReactNode }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = contentRef.current;
        if (!element) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            element.scrollTop += e.deltaY;
        };

        element.addEventListener('wheel', handleWheel, { passive: false });
        return () => element.removeEventListener('wheel', handleWheel);
    }, []);

    return (
        <ScrollAreaPrimitive.Root className="relative overflow-hidden h-[233px]">
            <ScrollAreaPrimitive.Viewport
                ref={contentRef}
                className="h-full w-full rounded-[inherit]"
            >
                <div className="px-2 py-2">
                    {children}
                </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
                className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px] absolute right-0 top-0"
                orientation="vertical"
            >
                <ScrollAreaPrimitive.Thumb
                    className="relative flex-1 rounded-full bg-border"
                />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
};

export const NoteTypeSelector = ({ value, onChange }: NoteTypeSelectorProps) => {
    const noteTypes = useNoteTypeStore((state: NoteTypeState) => state.noteTypes);
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    const filteredTypes = noteTypes.filter((type) =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allSelected = value.length === noteTypes.length;
    const triggerText = allSelected
        ? "All selected"
        : value.length === 0
            ? "Select note types..."
            : value.length === 1
                ? `"${noteTypes.find(type => type.id === value[0])?.name}" selected`
                : `${value.length} types selected`;

    const handleSelect = (typeId: string, isSelected: boolean) => {
        if (isSelected && value.length === 1) {
            toast({
                variant: "destructive",
                title: "Selection Required",
                description: "At least one note type must be selected",
            });
            return;
        }
        const newValue = isSelected
            ? value.filter(v => v !== typeId)
            : [...value, typeId];
        onChange(newValue);
    };

    const handleSelectAll = () => {
        onChange(noteTypes.map(type => type.id));
    };

    const handleBasicOnly = () => {
        const basicType = noteTypes.find(type => type.name.toLowerCase() === "definition");
        if (basicType) {
            onChange([basicType.id]);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Note Types</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {triggerText}
                        <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                    <div className="flex items-center justify-between gap-4 border-b p-2">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={handleSelectAll}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={handleBasicOnly}
                            >
                                Basic Only
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Search:</span>
                            <Input
                                className="h-8 w-[200px]"
                                placeholder="Search types..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <ScrollableContent >
                        {filteredTypes.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                No note type found.
                            </div>
                        ) : (
                            filteredTypes.map((type) => {
                                const isSelected = value.includes(type.id);
                                return (
                                    <div
                                        key={type.id}
                                        className={cn(
                                            "flex items-center gap-2 mr-1 rounded-sm px-2 py-0.5 text-sm outline-none mb-1 last:mb-0",
                                            "cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                            isSelected && "bg-accent",
                                            value.length === 1 && isSelected && "cursor-not-allowed opacity-60"
                                        )}
                                        onClick={() => handleSelect(type.id, isSelected)}
                                    >
                                        <div className="flex h-4 w-4 items-center justify-center">
                                            <Check
                                                className={cn(
                                                    "h-4 w-4",
                                                    isSelected ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{type.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {type.description}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </ScrollableContent>
                </PopoverContent>
            </Popover>
        </div>
    );
}; 