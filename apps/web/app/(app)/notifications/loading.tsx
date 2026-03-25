import { Skeleton, SkeletonCard } from "@/components/skeleton";

export default function ContentLoading() {
    return (
        <>
            <div className="glass-panel rounded-xl px-3 py-2 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2.5 w-20" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </>
    );
}
