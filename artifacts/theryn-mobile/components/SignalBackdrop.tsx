import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";

export function SignalBackdrop() {
  const colors = useColors();
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.8)).current;

  useFocusEffect(
    useCallback(() => {
      drift.setValue(0);
      pulse.setValue(0.8);
      const animation = Animated.loop(
        Animated.parallel([
          Animated.timing(drift, {
            toValue: 1,
            duration: 12000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.72, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }, [drift, pulse]),
  );

  const cyanTransform = {
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-34, 24] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-12, 22] }) },
      { scale: pulse },
    ],
  };
  const coralTransform = {
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [20, -28] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [22, -12] }) },
    ],
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors.background, colors.background, `${colors.primary}10`]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, styles.cyanOrb, { backgroundColor: colors.primary }, cyanTransform]} />
      <Animated.View style={[styles.orb, styles.coralOrb, { backgroundColor: colors.accent }, coralTransform]} />
       <View style={[styles.grid, { borderColor: `${colors.primary}12` }]}>
         {Array.from({ length: 10 }, (_, index) => (
           <View key={`h-${index}`} style={[styles.gridLineHorizontal, { bottom: index * 28, backgroundColor: `${colors.primary}12` }]} />
         ))}
         {Array.from({ length: 9 }, (_, index) => (
           <View key={`v-${index}`} style={[styles.gridLineVertical, { left: `${index * 12.5}%`, backgroundColor: `${colors.primary}10` }]} />
         ))}
       </View>
      <View style={[styles.horizon, { backgroundColor: `${colors.primary}20` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: "absolute", width: 260, height: 260, borderRadius: 130, opacity: 0.1 },
  cyanOrb: { top: -130, right: -80 },
  coralOrb: { bottom: -150, left: -90, opacity: 0.08 },
  grid: {
    position: "absolute",
    left: -80,
    right: -80,
    bottom: -100,
    height: 330,
    borderWidth: 1,
    transform: [{ perspective: 600 }, { rotateX: "58deg" }],
    opacity: 0.7,
  },
  gridLineHorizontal: { position: "absolute", left: 0, right: 0, height: 1 },
  gridLineVertical: { position: "absolute", top: 0, bottom: 0, width: 1 },
  horizon: { position: "absolute", left: 0, right: 0, bottom: "29%", height: 1, opacity: 0.32 },
});