import React, { useEffect, useMemo } from "react";
import { StyleSheet, Image, ImageSourcePropType, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const BURGER = require("@/assets/images/food/burger.png");
const SUSHI = require("@/assets/images/food/sushi.png");
const DONUT = require("@/assets/images/food/donut.png");
const CHICKEN = require("@/assets/images/food/chicken.png");

type FoodSpec = {
  source: ImageSourcePropType;
  /** size as fraction of the shorter screen side */
  scale: number;
  /** 0–1, visual center */
  cx: number;
  cy: number;
  /** max fraction of the image allowed to hang off-screen */
  hang: number;
  rotate: number;
  delay: number;
  drift: number;
  duration: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Large food-only decorations. They sit behind title/buttons and fill the
 * corners so the welcome page doesn't feel empty.
 */
const FOODS: FoodSpec[] = [
  { source: BURGER, scale: 0.58, cx: 0.0, cy: 0.02, hang: 0.10, rotate: -16, delay: 0, drift: 16, duration: 3600 },
  { source: SUSHI, scale: 0.50, cx: 1.0, cy: 0.12, hang: 0.32, rotate: 18, delay: 400, drift: 18, duration: 4000 },
  { source: DONUT, scale: 0.52, cx: 0.0, cy: 0.98, hang: 0.10, rotate: 12, delay: 200, drift: 14, duration: 3400 },
  { source: CHICKEN, scale: 0.56, cx: 1.0, cy: 0.96, hang: 0.42, rotate: -12, delay: 600, drift: 16, duration: 4200 },
];

function FloatingFoodItem({
  food,
  size,
  left,
  top,
}: {
  food: FoodSpec;
  size: number;
  left: number;
  top: number;
}) {
  const y = useSharedValue(0);
  const r = useSharedValue(food.rotate);

  useEffect(() => {
    y.value = withDelay(
      food.delay,
      withRepeat(
        withSequence(
          withTiming(-food.drift, {
            duration: food.duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(food.drift, {
            duration: food.duration,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );
    r.value = withDelay(
      food.delay,
      withRepeat(
        withSequence(
          withTiming(food.rotate + 5, {
            duration: food.duration * 1.1,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(food.rotate - 5, {
            duration: food.duration * 1.1,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );
  }, [food.delay, food.drift, food.duration, food.rotate, r, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.item,
        {
          width: size,
          height: size,
          left,
          top,
        },
        style,
      ]}
    >
      <Image source={food.source} style={styles.image} resizeMode="contain" />
    </Animated.View>
  );
}

/** Edge 3D foods with a gentle floating drift, kept on-page around the frame. */
export function FloatingFoods() {
  const { width, height } = useWindowDimensions();
  const base = Math.min(width, height);
  const density = height < 560 ? 0.88 : height < 700 ? 0.95 : 1;

  const placed = useMemo(
    () =>
      FOODS.map((food) => {
        const size = Math.round(base * food.scale * density);
        const hang = size * food.hang;
        const left = clamp(
          Math.round(food.cx * width - size / 2),
          Math.round(-hang),
          Math.round(width - size + hang)
        );
        const top = clamp(
          Math.round(food.cy * height - size / 2),
          Math.round(-hang),
          Math.round(height - size + hang)
        );
        return { food, size, left, top };
      }),
    [base, density, height, width]
  );

  return (
    <>
      {placed.map(({ food, size, left, top }, index) => (
        <FloatingFoodItem
          key={index}
          food={food}
          size={size}
          left={left}
          top={top}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    position: "absolute",
    zIndex: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
