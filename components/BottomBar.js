import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'Home',    icon: 'home',   iconOutline: 'home-outline',   label: 'Home'    },
  { name: 'Network', icon: 'people', iconOutline: 'people-outline', label: 'Network' },
  { name: 'Shop',    icon: 'bag',    iconOutline: 'bag-outline',    label: 'Shop'    },
  { name: 'Profile', icon: 'person', iconOutline: 'person-outline', label: 'Profile' },
];

export default function BottomBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8);

  return (
    <View style={[styles.barContainer, { paddingBottom: bottomPadding }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TABS[index] || {
          name: route.name,
          icon: 'grid',
          iconOutline: 'grid-outline',
          label: route.name,
        };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, isFocused && styles.activeIconBox]}>
              <Ionicons
                name={isFocused ? tab.icon : tab.iconOutline}
                size={22}
                color={isFocused ? '#E64A78' : '#8C7A82'}
              />
            </View>
            <Text
              style={[styles.tabLabel, isFocused && styles.activeTabLabel]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EAED',
    paddingTop: 8,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconBox: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  activeIconBox: {
    backgroundColor: '#FDEFF3',
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#8C7A82',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#E64A78',
    fontWeight: '700',
  },
});