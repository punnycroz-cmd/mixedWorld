export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-white/5 ${className}`}
            aria-hidden="true"
        />
    );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-3 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ children }: { children?: React.ReactNode }) {
    return (
        <div className="glass-panel rounded-xl p-4 space-y-4">
            {children ?? (
                <>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-2.5 w-20" />
                        </div>
                    </div>
                    <SkeletonText lines={2} />
                </>
            )}
        </div>
    );
}

export function PageSkeleton({
    cards = 3,
    header = true,
    aside = false
}: {
    cards?: number;
    header?: boolean;
    aside?: boolean;
}) {
    return (
        <div className="min-h-screen pb-20 text-slate-100 md:pb-6 relative z-0">
            {/* Fake header */}
            <div className="sticky top-0 z-40 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>

            <div className={`mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 px-2 py-4 sm:px-4 md:px-6 ${aside
                    ? "md:grid-cols-[200px_1fr] lg:grid-cols-[220px_minmax(0,1fr)_280px]"
                    : "md:grid-cols-[220px_minmax(0,1fr)]"
                }`}>
                {/* Sidebar skeleton */}
                <aside className="sticky top-[72px] hidden self-start md:flex md:flex-col md:gap-3 h-[calc(100vh-96px)]">
                    <div className="glass-panel rounded-2xl p-3 flex-1 flex flex-col">
                        <div className="px-2 pb-4">
                            <Skeleton className="h-2.5 w-24 mb-2" />
                            <Skeleton className="h-7 w-32" />
                        </div>
                        <div className="space-y-1.5 px-1">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full rounded-full" />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main content skeleton */}
                <main className="flex min-w-0 flex-col gap-3">
                    {header && (
                        <div className="glass-panel rounded-xl px-4 py-3 space-y-2">
                            <Skeleton className="h-2.5 w-16" />
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-3 w-72" />
                        </div>
                    )}
                    {Array.from({ length: cards }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </main>

                {/* Aside skeleton */}
                {aside && (
                    <aside className="hidden lg:flex lg:flex-col lg:gap-3">
                        <div className="glass-panel rounded-xl p-4 space-y-3">
                            <Skeleton className="h-2.5 w-16" />
                            <Skeleton className="h-5 w-28" />
                            <SkeletonText lines={2} />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
