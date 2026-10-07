import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  active: "#E64A78",
  inactive: "#9E8E93",
  surface: "#FFFFFF",
  border: "#F0EAED",
  shadow: "#2A1E24",
  badge: "#E64A78",
};

const TABS = [
  { name: "Home", icon: "home", iconOutline: "home-outline", label: "Home" },
  {
    name: "Network",
    icon: "people",
    iconOutline: "people-outline",
    label: "Network",
  },
  { name: "Shop", icon: "bag", iconOutline: "bag-outline", label: "Shop" },
  {
    name: "Profile",
    icon: "person",
    iconOutline: "person-outline",
    label: "Profile",
  },
];

function TabItem({
  tab,
  isFocused,
  badge,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}) {
  const progress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isFocused ? 1 : 0,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isFocused, progress]);

  const indicatorScaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });
  const indicatorOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });
  const iconTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });

  const hasBadge =
    badge !== undefined && badge !== null && badge !== "" && badge !== 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel || tab.label}
      testID={testID}
      android_ripple={null}
    >
      {/* Top indicator line */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            opacity: indicatorOpacity,
            transform: [{ scaleX: indicatorScaleX }],
          },
        ]}
      />

      <View style={styles.iconWrap}>
        <Animated.View
          style={{
            transform: [{ scale: iconScale }, { translateY: iconTranslateY }],
          }}
        >
          <Ionicons
            name={isFocused ? tab.icon : tab.iconOutline}
            size={24}
            color={isFocused ? COLORS.active : COLORS.inactive}
          />
        </Animated.View>

        {hasBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {typeof badge === "number" && badge > 99 ? "99+" : badge}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.tabLabel, isFocused && styles.activeTabLabel]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function BottomBar({ state, navigation, descriptors }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 12 : 8);

  return (
    <View style={[styles.barContainer, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TABS[index] || {
          name: route.name,
          icon: "grid",
          iconOutline: "grid-outline",
          label: route.name,
        };

        const options = descriptors?.[route.key]?.options || {};

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            tab={tab}
            isFocused={isFocused}
            badge={options.tabBarBadge}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  tabPressed: {
    opacity: 0.6,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: COLORS.active,
  },
  iconWrap: {
    height: 28,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: COLORS.inactive,
    textAlign: "center",
  },
  activeTabLabel: {
    color: COLORS.active,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    top: -1,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.badge,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
