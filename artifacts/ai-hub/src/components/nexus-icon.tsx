interface TherynIconProps {
  size?: number;
  className?: string;
}

export function TherynIcon({ size = 40, className = "" }: TherynIconProps) {
  const id = `ni-${size}-${Math.random().toString(36).slice(2, 7)}`;
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
        <linearGradient id={`${id}-sg`} x1="6" y1="6" x2="94" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff4444" />
          <stop offset="50%" stopColor="#cc0000" />
          <stop offset="100%" stopColor="#ff6666" />
        </linearGradient>
        <radialGradient id={`${id}-cg`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#ff4444" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#cc0000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0505" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="50" r="50" fill={`url(#${id}-bg)`} />
      <circle cx="50" cy="50" r="47" stroke={`url(#${id}-sg)`} strokeWidth="0.8" fill="none" opacity="0.4" />

      <polygon
        points="50,6 57.5,41 94,50 57.5,59 50,94 42.5,59 6,50 42.5,41"
        fill={`url(#${id}-sg)`}
        filter={`url(#${id}-glow)`}
      />
      <polygon
        points="50,26 54.5,44.5 73,50 54.5,55.5 50,74 45.5,55.5 27,50 45.5,44.5"
        fill={`url(#${id}-sg)`}
        opacity="0.35"
      />
      <circle cx="50" cy="50" r="20" fill={`url(#${id}-cg)`} />
      <circle cx="50" cy="50" r="4.5" fill="white" opacity="0.95" />
    </svg>
  );
}
