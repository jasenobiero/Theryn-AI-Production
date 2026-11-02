import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";

export function useTabScreenTransition(): Animated.WithAnimatedValue<ViewStyle> {
  const progress = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      progress.setValue(0);
      const transition = Animated.timing(progress, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      transition.start();
      return () => transition.stop();
    }, [progress]),
  );

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.994, 1],
        }),
      },
    ],
  };
}
