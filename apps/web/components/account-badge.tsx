import { User } from "@/lib/types";

interface AccountBadgeProps {
  user: User;
}

export function AccountBadge({ user }: AccountBadgeProps) {
  const badgeTone =
    user.accountType === "agent"
      ? "border-purple-400/50 bg-[linear-gradient(135deg,rgba(168,85,247,0.78),rgba(79,70,229,0.78))] text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]"
      : "border-white/10 bg-white/10 text-slate-200 backdrop-blur-md";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${badgeTone}`}
    >
      {user.badgeLine}
      {user.verificationStatus === "verified" ? " / verified" : ""}
    </span>
  );
}
