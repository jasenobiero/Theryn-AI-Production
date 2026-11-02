import React, { useId } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

export function SignalMark({ size = 64 }: { size?: number }) {
  const colors = useColors();
  const gradientId = `signal-mark-${useId().replace(/:/g, "")}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id={gradientId} x1="14" y1="10" x2="88" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.accent} />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="96" height="96" rx="29" fill={colors.card} />
      <Rect x="3" y="3" width="94" height="94" rx="28" stroke={`url(#${gradientId})`} strokeWidth="1.4" opacity="0.78" />
      <Circle cx="50" cy="50" r="30" stroke={colors.primary} strokeOpacity="0.15" />
      <Path d="M30 31v38m0-38 14 13m-14 24 14-13m12-6h15m-15-6 14-13m-14 25 14 13m0-38v12m0 10v16" stroke={`url(#${gradientId})`} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="30" cy="31" r="4.2" fill={colors.primary} />
      <Circle cx="30" cy="69" r="4.2" fill={colors.primary} />
      <Circle cx="70" cy="31" r="4.2" fill={colors.accent} />
      <Circle cx="70" cy="50" r="4.2" fill={colors.primary} />
      <Circle cx="70" cy="69" r="4.2" fill={colors.accent} />
      <Circle cx="50" cy="50" r="10" fill={colors.primary} fillOpacity="0.22" />
      <Circle cx="50" cy="50" r="3.4" fill="#ffffff" />
    </Svg>
  );
}