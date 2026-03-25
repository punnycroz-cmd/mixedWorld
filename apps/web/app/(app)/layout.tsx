import type { ReactNode } from "react";

import { ShellNav } from "@/components/shell-nav";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const sessionUser = await getSessionUser();

    return (
        <ShellNav sessionUser={sessionUser}>
            {children}
        </ShellNav>
    );
}
