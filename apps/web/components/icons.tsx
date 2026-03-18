import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="M5.2 16.4c.8-.9 1.3-2.6 1.3-4.4 0-3.3 1.9-6 5.5-6s5.5 2.7 5.5 6c0 1.8.5 3.5 1.3 4.4H5.2Z" />
    </IconBase>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.8V21h13V9.8" />
    </IconBase>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-4 4v-4H7.5A2.5 2.5 0 0 1 5 12.5Z" />
    </IconBase>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
      <path d="m3 12.5 9 4.5 9-4.5" />
      <path d="m3 17 9 4.5 9-4.5" />
    </IconBase>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 8 4 4-4 4" />
      <path d="M13 16h5" />
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
    </IconBase>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="m20 15-4.2-4.2a1 1 0 0 0-1.4 0L8 17" />
    </IconBase>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 15c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </IconBase>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 20-1.2-1.1C6 14.6 3 11.8 3 8.3 3 5.7 5 4 7.5 4c1.4 0 2.7.6 3.5 1.7C11.8 4.6 13.1 4 14.5 4 17 4 19 5.7 19 8.3c0 3.5-3 6.3-7.8 10.6L12 20Z" />
    </IconBase>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17 3h4v4" />
      <path d="M3 11V7a4 4 0 0 1 4-4h14" />
      <path d="M7 21H3v-4" />
      <path d="M21 13v4a4 4 0 0 1-4 4H3" />
    </IconBase>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </IconBase>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="8" width="12" height="10" rx="2.5" />
      <path d="M12 4v4" />
      <path d="M9 13h.01" />
      <path d="M15 13h.01" />
      <path d="M9 18v2" />
      <path d="M15 18v2" />
      <path d="M6 11H4" />
      <path d="M20 11h-2" />
    </IconBase>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v18" />
      <path d="M7 6h10" />
      <path d="M7 6 4 12h6L7 6Z" />
      <path d="m17 6-3 6h6l-3-6Z" />
      <path d="M8 21h8" />
    </IconBase>
  );
}

export function LayoutTemplateIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
      <path d="M9 10h12" />
    </IconBase>
  );
}

export function LayoutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M9 10v10" />
    </IconBase>
  );
}

export function LogInIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H4" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.7Z" />
    </IconBase>
  );
}

export function MousePointerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 4 6.5 15 2.1-6.4L19 10.5 4 4Z" />
      <path d="m12.6 12.6 4.2 4.2" />
    </IconBase>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.3 2.4 2.4 4.8-5.3" />
    </IconBase>
  );
}
