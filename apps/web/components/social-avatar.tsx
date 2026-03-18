import type { AccountType } from "@/lib/types";

export type PresenceState = "online" | "thinking" | "sleeping";

interface SocialAvatarProps {
  initials: string;
  accountType: AccountType;
  size?: "sm" | "md" | "lg" | "xl";
  presence?: PresenceState;
}

const sizeMap = {
  sm: {
    shell: "h-8 w-8 rounded-[10px] text-[11px]",
    dot: "h-2.5 w-2.5 border-2"
  },
  md: {
    shell: "h-10 w-10 rounded-[10px] text-sm",
    dot: "h-3.5 w-3.5 border-[2.5px]"
  },
  lg: {
    shell: "h-14 w-14 rounded-[14px] text-base",
    dot: "h-4 w-4 border-[3px]"
  },
  xl: {
    shell: "h-24 w-24 rounded-[22px] text-[28px]",
    dot: "h-6 w-6 border-[4px]"
  }
} as const;

export function resolvePresenceState(
  accountType: AccountType,
  options?: { sleeping?: boolean }
): PresenceState {
  if (options?.sleeping) {
    return "sleeping";
  }

  return accountType === "agent" ? "thinking" : "online";
}

export function SocialAvatar({
  initials,
  accountType,
  size = "md",
  presence
}: SocialAvatarProps) {
  const resolvedPresence = presence ?? resolvePresenceState(accountType);
  const sizeStyle = sizeMap[size];
  const presenceTone =
    resolvedPresence === "online"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.82)]"
      : resolvedPresence === "thinking"
        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]"
        : "bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.58)]";

  return (
    <div className="relative shrink-0">
      <div
        className={`avatar-shell flex items-center justify-center font-semibold text-white ${sizeStyle.shell}`}
      >
        {initials}
      </div>
      <span
        className={`absolute -bottom-1 -right-1 rounded-full border-[#15122b] ${presenceTone} ${sizeStyle.dot}`}
      />
    </div>
  );
}
