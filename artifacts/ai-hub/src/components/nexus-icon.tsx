interface TherynIconProps {
  size?: number;
  className?: string;
}

export function TherynIcon({ size = 40, className = "" }: TherynIconProps) {
  const id = `ni-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-sg`} x1="16" y1="12" x2="86" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8ffcff" />
          <stop offset="42%" stopColor="#38d9ff" />
          <stop offset="100%" stopColor="#ff6b8a" />
        </linearGradient>
        <radialGradient id={`${id}-bg`} cx="32%" cy="22%" r="90%">
          <stop offset="0%" stopColor="#16303a" />
          <stop offset="50%" stopColor="#0b1720" />
          <stop offset="100%" stopColor="#060a10" />
        </radialGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#a9fbff" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#38d9ff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="2" y="2" width="96" height="96" rx="29" fill={`url(#${id}-bg)`} />
      <rect x="3" y="3" width="94" height="94" rx="28" stroke={`url(#${id}-sg)`} strokeWidth="1.2" fill="none" opacity="0.65" />
      <path d="M25 68V32l25 36V32l25 36V32" stroke={`url(#${id}-sg)`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-glow)`} />
      <path d="M25 78h50" stroke="#8ffcff" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <circle cx="50" cy="50" r="18" fill={`url(#${id}-core)`} opacity="0.5" />
    </svg>
  );
}
