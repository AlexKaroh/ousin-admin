type IconProps = { className?: string; size?: number };

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

export function DashboardIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </svg>
  );
}

export function UsersIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c.7-3 3-4.5 6-4.5S14.3 17 15 20" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M14.5 19c.5-1.6 2-2.7 4-2.7s3.5 1 4 2.7" />
    </svg>
  );
}

export function OrdersIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function ReviewsIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="m12 4 2.5 5 5.5.8-4 3.9 1 5.5L12 16.6 7 19.2l1-5.5L4 9.8l5.5-.8L12 4Z" />
    </svg>
  );
}

export function LogoutIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h12" />
    </svg>
  );
}

export function SearchIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PencilIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m12.5 7.5 4 4" />
    </svg>
  );
}

export function TrashIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="m7 7 1 12h8l1-12" />
    </svg>
  );
}

export function CheckIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

export function XIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function LinkIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M10 13.5 14 9.5" />
      <path d="M7.5 16.5h-2a4 4 0 1 1 0-8h2" />
      <path d="M16.5 7.5h2a4 4 0 1 1 0 8h-2" />
    </svg>
  );
}

export function CopyIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
