// Simple line icons for the bottom navigation (24px, inherit colour). Inline
// SVG so there's no icon dependency to carry around.

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Paw print — Dogs. */
export function PawIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="6.5" cy="10" rx="1.7" ry="2.3" />
      <ellipse cx="10" cy="6" rx="1.7" ry="2.3" />
      <ellipse cx="14" cy="6" rx="1.7" ry="2.3" />
      <ellipse cx="17.5" cy="10" rx="1.7" ry="2.3" />
      <path d="M12 12c-2.8 0-5 2.4-5 4.6 0 1.6 1.3 2.4 2.6 2.4 1 0 1.6-.4 2.4-.4s1.4.4 2.4.4c1.3 0 2.6-.8 2.6-2.4 0-2.2-2.2-4.6-5-4.6z" />
    </Svg>
  );
}

/** Person stepping through a door — Site Visitors (sign in / out). */
export function SignInIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l4-4-4-4" />
      <path d="M14 12H4" />
    </Svg>
  );
}

/** Clipboard — the old Staff tab. */
export function ClipboardIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5h6V7H9z" />
      <path d="M9 12h6M9 16h4" />
    </Svg>
  );
}

/** Two people — People. */
export function PeopleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.4-3.2 2.6-5 5.5-5s5.1 1.8 5.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2c2.6-.3 4.3 1.2 4.7 4.3" />
    </Svg>
  );
}

/** List with lines — Logs. */
export function LogsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Svg>
  );
}

/** Bars — Reports. */
export function ReportsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h16" />
      <rect x="6" y="11" width="3" height="7" rx="0.6" />
      <rect x="10.5" y="6" width="3" height="12" rx="0.6" />
      <rect x="15" y="9" width="3" height="9" rx="0.6" />
    </Svg>
  );
}

/** Question mark in a circle — Help. */
export function HelpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" />
    </Svg>
  );
}

/** Clipboard with a plus — Intake (taking a new dog in). */
export function IntakeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5V3.5h6v1" />
      <path d="M12 10v6M9 13h6" />
    </Svg>
  );
}
