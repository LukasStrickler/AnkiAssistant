import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { ankiClient } from '@/lib/anki';
import DeckChat from "./deck-chat";

export function deckToPath(deckFullName: string) {
    return `/deck/${deckFullName.split('::').map(encodeURIComponent).join('/')}`;
}

function Breadcrumbs({ items }: { items: { title: React.ReactNode, href: string | null }[] }) {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        <BreadcrumbItem>
                            {item.href ? (
                                <BreadcrumbLink href={item.href}>
                                    {item.title}
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>
                                    {item.title}
                                </BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {index < items.length - 1 && (
                            <BreadcrumbSeparator />
                        )}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

function generateBreadcrumbItems(decodedSlug: string[], cardCount: number) {
    const breadcrumbItems = [];
    const slugLength = decodedSlug.length;
    const createDeckHref = (path: string[]) => `/deck/${path.map(encodeURIComponent).join('/')}`;

    // Always show root segment
    if (slugLength > 0) {
        breadcrumbItems.push({
            title: decodedSlug[0]!,
            href: createDeckHref([decodedSlug[0]!])
        });
    }

    // Handle middle segments based on slug complexity
    const shouldShowEllipsis = slugLength > 4;
    const shouldShowDirectMiddle = slugLength === 4;

    if (shouldShowDirectMiddle) {
        breadcrumbItems.push({
            title: decodedSlug[1],
            href: createDeckHref([decodedSlug[1]!])
        });
    }

    if (shouldShowEllipsis) {
        const hiddenSegments = decodedSlug.slice(1, -2);
        breadcrumbItems.push({
            title: (
                <HoverCard>
                    <HoverCardTrigger className="cursor-pointer px-0">...</HoverCardTrigger>
                    <HoverCardContent className="w-auto p-2 rounded-xl">
                        <div className="flex flex-col gap-1">
                            {hiddenSegments.map((segment, index) => (
                                <a
                                    key={`${segment}-${index}`}
                                    href={createDeckHref(decodedSlug.slice(0, index + 2))}
                                    className="text-sm hover:bg-accent px-2 py-1 rounded"
                                >
                                    {segment}
                                </a>
                            ))}
                        </div>
                    </HoverCardContent>
                </HoverCard>
            ),
            href: null
        });
    }

    // Show parent segment when applicable
    if (slugLength >= 3) {
        const parentIndex = slugLength - 2;
        breadcrumbItems.push({
            title: decodedSlug[parentIndex],
            href: createDeckHref(decodedSlug.slice(0, parentIndex + 1))
        });
    }

    // Current segment with card count
    if (slugLength > 1) {
        const currentSegment = decodedSlug[slugLength - 1];
        breadcrumbItems.push({
            title: (
                <span className="flex items-center gap-2">
                    {currentSegment}
                    <span className="text-muted-foreground text-sm">
                        (<span className="tabular-nums">{cardCount}</span>)
                    </span>
                </span>
            ),
            href: null
        });
    }

    return breadcrumbItems;
}

export default async function DeckPage({
    params,
}: {
    params: Promise<{ slug: string[] }>
}) {
    const { slug } = await params;
    const decodedSlug = slug.map(decodeURIComponent);
    const deckFullName = decodedSlug.join('::');

    const cardCount = await ankiClient.getDeckCardCount(deckFullName);

    const breadcrumbItems = generateBreadcrumbItems(decodedSlug, cardCount);

    return <>
        <header className="pb-4">
            <div className="flex mt-4 mb-2 shrink-0 items-center gap-2">

                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1 rounded-xl" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumbs items={breadcrumbItems} />
                </div>
            </div>
            {/* <Separator className="py-0.5 rounded-xl w-[98%] mx-auto mb-2" /> */}
        </header>


        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {/* Display deck: {deckFullName} */}
            <DeckChat currentDeck={deckFullName} />
        </div>
    </>;
}