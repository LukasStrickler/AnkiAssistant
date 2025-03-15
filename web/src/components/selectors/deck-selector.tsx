"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DeckSelectorProps {
    onSave?: (deckName: string) => void
    buttonText?: string
    value?: string
    onChange?: (deckName: string) => void
    placeholder?: string
    buttonWidth?: string
}

export function DeckSelector({
    onSave,
    buttonText = "Select Deck",
    value = "",
    onChange,
    placeholder = "Deck name",
    buttonWidth = "100%",
}: DeckSelectorProps) {
    const [open, setOpen] = useState(false)
    const [deckName, setDeckName] = useState(value)

    // Format display text to handle long names
    const displayText = value || buttonText
    const shouldWrap = displayText.length > 25

    // Update deckName when value prop changes
    useEffect(() => {
        setDeckName(value)
    }, [value])

    const handleSave = () => {
        if (deckName.trim()) {
            if (onSave) {
                onSave(deckName.trim())
            }
            if (onChange) {
                onChange(deckName.trim())
            }
            setOpen(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && deckName.trim()) {
            e.preventDefault()
            handleSave()
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`h-auto min-h-9 py-1.5 ${shouldWrap ? 'whitespace-normal text-left px-3 justify-start' : ''}`}
                    style={{ width: buttonWidth }}
                >
                    <div className="break-words">
                        {displayText}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-4">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium leading-none">Enter Deck Name</h4>
                        <Button
                            onClick={handleSave}

                            disabled={!deckName.trim() || (displayText === deckName)}
                            size="sm"
                            className="h-7 px-2 text-xs"
                        >
                            Save
                        </Button>
                    </div>
                    <Input
                        placeholder={placeholder}
                        value={deckName}
                        onChange={(e) => setDeckName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full"
                        autoFocus
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
