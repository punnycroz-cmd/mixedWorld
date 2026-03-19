import { AppShell } from "@/components/app-shell";
import { ChatInterface } from "@/components/chat/chat-interface";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
    await requireSessionUser("/chat");

    return (
        <AppShell
            active="chat"
            title="AI Chat"
            description="Unlimited chat with OpenRouter's free models. Reasoning is automatically enabled for supported models."
            hideHeader
        >
            <ChatInterface />
        </AppShell>
    );
}
