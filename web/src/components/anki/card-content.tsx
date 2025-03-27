import { useRef, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import { type AnkiCard } from "@/lib/anki";


// Skeleton loader component
const FieldSkeleton = () => (
    <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>
);

export function CardContent({ card }: { card: AnkiCard }) {
    const frontRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Add constant for shared render config
    // eslint-disable-next-line
    const katexConfig = {
        delimiters: [
            { left: "\\(", right: "\\)", display: false },
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true }
        ]
    };

    // Add fade-in transition when content loads
    useEffect(() => {
        if (card.fields.Front && card.fields.Back) {
            setIsLoaded(true);
        }
    }, [card]);

    useEffect(() => {
        // Combine into single effect with cleanup
        const front = frontRef.current;
        const back = backRef.current;

        if (front) renderMathInElement(front, katexConfig);
        if (back) renderMathInElement(back, katexConfig);

        return () => {
            if (front) front.querySelectorAll('.katex').forEach(el => el.remove());
            if (back) back.querySelectorAll('.katex').forEach(el => el.remove());
        };
    }, [card.fields.Front, card.fields.Back, katexConfig]);

    return <div className={`p-4 border rounded-lg rounded-xl transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <div ref={frontRef} className="[&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
            {card.fields.Front ?
                <div dangerouslySetInnerHTML={{ __html: card.fields.Front }} /> :
                <FieldSkeleton />
            }
        </div>
        <Separator orientation="horizontal" className="my-1" />
        <div ref={backRef} className="[&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
            {card.fields.Back ?
                <div dangerouslySetInnerHTML={{ __html: card.fields.Back }} /> :
                <FieldSkeleton />
            }
        </div>
    </div>
}