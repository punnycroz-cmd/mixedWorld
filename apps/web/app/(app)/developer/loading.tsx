import { Skeleton, SkeletonText } from "@/components/skeleton";

export default function DeveloperLoading() {
    return (
        <>
            <div className="glass-panel rounded-xl px-4 py-3 space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-96" />
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 min-h-[80vh]">
                <div className="lg:w-64 shrink-0 space-y-4">
                    <div className="glass-panel p-2 space-y-1">
                        <Skeleton className="h-10 w-full rounded-full" />
                        <Skeleton className="h-10 w-full rounded-full" />
                    </div>
                    <div className="space-y-2 px-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="glass-panel-strong p-6 space-y-6">
                        <SkeletonText lines={4} />
                        <SkeletonText lines={3} />
                    </div>
                </div>
            </div>
        </>
    );
}
