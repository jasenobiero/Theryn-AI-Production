import React from "react";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

export function SignalMark({ size = 64 }: { size?: number }) {
  const colors = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="signalMarkGradient" x1="14" y1="10" x2="88" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.accent} />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="96" height="96" rx="29" fill={colors.card} />
      <Rect x="3" y="3" width="94" height="94" rx="28" stroke="url(#signalMarkGradient)" strokeWidth="1.4" opacity="0.75" />
      <Path d="M25 68V32l25 36V32l25 36V32" stroke="url(#signalMarkGradient)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M25 78h50" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </Svg>
  );
}