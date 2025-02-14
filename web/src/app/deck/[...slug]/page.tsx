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

export default async function DeckPage({
    params,
}: {
    params: Promise<{ slug: string[] }>
}) {
    const { slug } = await params;

    const deckFullName = slug.map(decodeURIComponent).join('::');
    const decodedSlug = slug.map(decodeURIComponent);
    const breadcrumbItems = [];

    // Always show first segment (root)
    if (decodedSlug.length > 0) {
        breadcrumbItems.push({
            title: decodedSlug[0],
            href: `/deck/${encodeURIComponent(decodedSlug[0]!)}`
        });
    }

    // Show ellipsis if there are more than 4 segments
    if (decodedSlug.length > 4) {
        const hiddenSegments = decodedSlug.slice(1, -2);
        breadcrumbItems.push({
            title: (
                <HoverCard>
                    <HoverCardTrigger className="cursor-pointer px-0">...</HoverCardTrigger>
                    <HoverCardContent className="w-auto p-2 rounded-xl">
                        <div className="flex flex-col gap-1">
                            {hiddenSegments.map((segment: string, index: number) => {
                                const path = decodedSlug.slice(0, index + 2);
                                return (
                                    <a
                                        key={index}
                                        href={`/deck/${path.map(encodeURIComponent).join('/')}`}
                                        className="text-sm hover:bg-accent px-2 py-1 rounded"
                                    >
                                        {segment}
                                    </a>
                                );
                            })}
                        </div>
                    </HoverCardContent>
                </HoverCard>
            ),
            href: null
        });
    }

    // Show parent if exists (second-to-last segment)
    if (decodedSlug.length >= 3) {
        const parentIndex = decodedSlug.length - 2;
        breadcrumbItems.push({
            title: decodedSlug[parentIndex],
            href: `/deck/${decodedSlug.slice(0, parentIndex + 1).map(encodeURIComponent).join('/')}`
        });
    }

    // Always show current segment (last)
    if (decodedSlug.length > 1) {
        breadcrumbItems.push({
            title: decodedSlug[decodedSlug.length - 1],
            href: null
        });
    }

    return <>

        <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1 rounded-xl" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbItems.map((item, index) => (
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
                                {index < breadcrumbItems.length - 1 && (
                                    <BreadcrumbSeparator />
                                )}
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            Display deck: {deckFullName}
        </div>
    </>;
}