interface TherynIconProps {
  size?: number;
  className?: string;
}

export function TherynIcon({ size = 40, className = "" }: TherynIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`theryn-mark ${className}`}
      style={{ color: "hsl(var(--foreground))" }}
    >
      <path d="M30 30L50 48 71 28M30 30V68L50 48M30 68L50 48M50 48H73M71 28L73 48 71 70M73 48L50 48M71 70L50 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="30" r="5.7" fill="currentColor" />
      <circle cx="30" cy="68" r="5.7" fill="currentColor" />
      <circle cx="71" cy="28" r="5.7" fill="currentColor" />
      <circle cx="73" cy="48" r="5.7" fill="currentColor" />
      <circle cx="71" cy="70" r="5.7" fill="currentColor" />
      <circle cx="50" cy="48" r="9.6" fill="currentColor" />
    </svg>
  );
}
