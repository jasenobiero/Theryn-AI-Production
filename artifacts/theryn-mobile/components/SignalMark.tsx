import Svg, { Circle, Path, Rect } from "react-native-svg";

export function SignalMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Rect width="100" height="100" fill="#ffffff" />
      <Path d="M30 30L50 48 71 28M30 30V68L50 48M30 68L50 48M50 48H73M71 28L73 48 71 70M73 48L50 48M71 70L50 48" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="30" cy="30" r="5.7" fill="#000000" />
      <Circle cx="30" cy="68" r="5.7" fill="#000000" />
      <Circle cx="71" cy="28" r="5.7" fill="#000000" />
      <Circle cx="73" cy="48" r="5.7" fill="#000000" />
      <Circle cx="71" cy="70" r="5.7" fill="#000000" />
      <Circle cx="50" cy="48" r="9.6" fill="#000000" />
    </Svg>
  );
}