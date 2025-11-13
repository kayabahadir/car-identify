import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const SkeletonLoader = () => {
  const shimmerAnimatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shimmer animation (soldan sağa kayan ışık efekti)
    Animated.loop(
      Animated.timing(shimmerAnimatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation (yanıp sönme)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  const opacity = pulseAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const SkeletonBox = ({ width, height, style }) => (
    <Animated.View
      style={[
        styles.skeletonBox,
        { width, height, opacity },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Skeleton Tab Navigation */}
      <View style={styles.tabContainer}>
        <SkeletonBox width={isTablet ? 120 : 90} height={isTablet ? 45 : 36} style={styles.tabItem} />
        <SkeletonBox width={isTablet ? 100 : 75} height={isTablet ? 45 : 36} style={styles.tabItem} />
        <SkeletonBox width={isTablet ? 100 : 75} height={isTablet ? 45 : 36} style={styles.tabItem} />
        <SkeletonBox width={isTablet ? 120 : 90} height={isTablet ? 45 : 36} style={styles.tabItem} />
      </View>

      {/* Skeleton Content Cards */}
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <SkeletonBox width="40%" height={isTablet ? 20 : 16} style={styles.label} />
          <SkeletonBox width="80%" height={isTablet ? 26 : 20} style={styles.value} />
        </View>

        <View style={styles.card}>
          <SkeletonBox width="50%" height={isTablet ? 20 : 16} style={styles.label} />
          <SkeletonBox width="60%" height={isTablet ? 26 : 20} style={styles.value} />
        </View>

        <View style={styles.card}>
          <SkeletonBox width="35%" height={isTablet ? 20 : 16} style={styles.label} />
          <SkeletonBox width="90%" height={isTablet ? 26 : 20} style={styles.value} />
        </View>

        <View style={styles.card}>
          <SkeletonBox width="45%" height={isTablet ? 20 : 16} style={styles.label} />
          <SkeletonBox width="70%" height={isTablet ? 26 : 20} style={styles.value} />
        </View>

        <View style={styles.card}>
          <SkeletonBox width="38%" height={isTablet ? 20 : 16} style={styles.label} />
          <SkeletonBox width="85%" height={isTablet ? 26 : 20} style={styles.value} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: isTablet ? 30 : 20,
    marginBottom: isTablet ? 25 : 20,
  },
  tabItem: {
    marginRight: isTablet ? 15 : 10,
    borderRadius: isTablet ? 24 : 20,
  },
  contentContainer: {
    backgroundColor: 'white',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 30 : 20,
    marginHorizontal: isTablet ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: isTablet ? 12 : 8,
    elevation: 5,
  },
  card: {
    marginBottom: isTablet ? 25 : 20,
  },
  skeletonBox: {
    backgroundColor: '#e5e7eb',
    borderRadius: isTablet ? 12 : 8,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth * 0.5,
  },
  shimmerGradient: {
    flex: 1,
  },
  label: {
    marginBottom: isTablet ? 10 : 8,
  },
  value: {
    marginBottom: 0,
  },
});

export default SkeletonLoader;

