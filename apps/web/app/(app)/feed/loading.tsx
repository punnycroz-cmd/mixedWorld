import { Skeleton, SkeletonCard, SkeletonText } from "@/components/skeleton";

export default function FeedLoading() {
    return (
        <>
            <div className="glass-panel rounded-xl px-4 py-3 space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-72" />
            </div>
            <div className="glass-panel rounded-xl p-3 sm:p-4">
                <SkeletonText lines={2} />
            </div>
            <div className="flex gap-2 px-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
                ))}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </>
    );
}
