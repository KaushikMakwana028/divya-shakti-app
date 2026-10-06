import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import Svg, { Line, Circle, Rect, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Geometry configuration for mobile tree
const CARD_WIDTH = 184;
const CARD_HEIGHT = 68;
const GAP_X = 22; // Horizontal gap between sibling subtrees
const GAP_Y = 125; // Vertical distance between levels
const ROOT_GAP_X = 36; // Gap between Level-1 root trees
const PADDING_X = 30;
const PADDING_Y = 30;

export default function NetworkTreeGraph({
  data = [],
  searchQuery = '',
  onSelectMember,
}) {
  const [zoomScale, setZoomScale] = useState(0.85); // Default comfortable zoom on mobile
  const scrollHRef = useRef(null);
  const scrollVRef = useRef(null);

  // Finger pinch-to-zoom gesture tracking
  const baseScale = useRef(0.85);
  const pinchDistance = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            pinchDistance.current = Math.hypot(dx, dy);
            baseScale.current = zoomScale;
          }
        },
        onPanResponderMove: (evt) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length === 2 && pinchDistance.current > 0) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDistance = Math.hypot(dx, dy);
            const factor = currentDistance / pinchDistance.current;
            const newScale = Math.min(Math.max(baseScale.current * factor, 0.45), 1.5);
            setZoomScale(Number(newScale.toFixed(2)));
          }
        },
        onPanResponderRelease: () => {
          pinchDistance.current = 0;
        },
        onPanResponderTerminate: () => {
          pinchDistance.current = 0;
        },
      }),
    [zoomScale]
  );

  // Compute 2D tree layout coordinates
  const { positions, edges, canvasWidth, canvasHeight } = useMemo(() => {
    if (!data || data.length === 0) {
      return { positions: [], edges: [], canvasWidth: SCREEN_WIDTH, canvasHeight: 400 };
    }

    // 1. Recursive calculation of subtree widths
    function computeSubtreeWidth(node) {
      if (!node.children || node.children.length === 0) {
        node._width = CARD_WIDTH;
        node._subtreeWidth = CARD_WIDTH;
        return CARD_WIDTH;
      }
      let total = 0;
      node.children.forEach((child, i) => {
        const w = computeSubtreeWidth(child);
        total += w;
        if (i > 0) total += GAP_X;
      });
      node._width = CARD_WIDTH;
      node._subtreeWidth = Math.max(CARD_WIDTH, total);
      return node._subtreeWidth;
    }

    const posList = [];
    const edgeList = [];
    let maxLevel = 0;

    // 2. Assign positions
    function assignPositions(node, left, level) {
      if (level > maxLevel) maxLevel = level;
      const y = level * GAP_Y + PADDING_Y;
      let x = left;

      if (!node.children || node.children.length === 0) {
        x = left + (node._subtreeWidth - CARD_WIDTH) / 2;
      } else {
        let childLeft = left;
        const childrenCenters = [];

        node.children.forEach((child) => {
          const cCenter = assignPositions(child, childLeft, level + 1);
          childrenCenters.push(cCenter);
          childLeft += child._subtreeWidth + GAP_X;
        });

        // Center parent over all children
        const minCenter = childrenCenters[0];
        const maxCenter = childrenCenters[childrenCenters.length - 1];
        const parentCenter = (minCenter + maxCenter) / 2;
        x = parentCenter - CARD_WIDTH / 2;

        // Orthogonal connector specification
        const parentX = x + CARD_WIDTH / 2;
        const parentY = y + CARD_HEIGHT;
        const midY = parentY + (GAP_Y - CARD_HEIGHT) * 0.42;
        const childY = (level + 1) * GAP_Y + PADDING_Y;

        edgeList.push({
          parentX,
          parentY,
          midY,
          childY,
          childrenCenters,
          color: node.badgeColor || '#CBD5E1',
        });
      }

      posList.push({
        ...node,
        x,
        y,
        level,
      });

      return x + CARD_WIDTH / 2;
    }

    let currentLeft = PADDING_X;
    data.forEach((root) => {
      computeSubtreeWidth(root);
      assignPositions(root, currentLeft, 0);
      currentLeft += root._subtreeWidth + ROOT_GAP_X;
    });

    const calculatedWidth = Math.max(SCREEN_WIDTH, currentLeft + PADDING_X);
    const calculatedHeight = (maxLevel + 1) * GAP_Y + CARD_HEIGHT + PADDING_Y * 2;

    return {
      positions: posList,
      edges: edgeList,
      canvasWidth: calculatedWidth,
      canvasHeight: calculatedHeight,
    };
  }, [data]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.3));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.55));
  };

  const handleZoomReset = () => {
    setZoomScale(0.85);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Floating Zoom & Info Controls */}
      <View style={styles.controlsBar}>
        <View style={styles.hintTag}>
          <Ionicons name="scan-outline" size={13} color="#C89738" />
          <Text style={styles.hintText}>Pinch to zoom • Drag to pan</Text>
        </View>

        <View style={styles.zoomButtonsGroup}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={handleZoomOut}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="remove" size={18} color="#2A1E24" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomBtn, styles.zoomResetBtn]}
            onPress={handleZoomReset}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomPercentText}>{Math.round(zoomScale * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={handleZoomIn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={18} color="#2A1E24" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2D Scrollable Tree Canvas */}
      <ScrollView
        ref={scrollVRef}
        style={styles.outerScroll}
        contentContainerStyle={{ minHeight: canvasHeight * zoomScale + 60 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          ref={scrollHRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ minWidth: canvasWidth * zoomScale + 60 }}
        >
          <View
            style={[
              styles.canvas,
              {
                width: canvasWidth,
                height: canvasHeight,
                transform: [{ scale: zoomScale }],
                transformOrigin: 'top left',
              },
            ]}
          >
            {/* SVG Connector Layer */}
            <Svg width={canvasWidth} height={canvasHeight} style={StyleSheet.absoluteFill}>
              {edges.map((edge, index) => {
                const firstChildX = edge.childrenCenters[0];
                const lastChildX = edge.childrenCenters[edge.childrenCenters.length - 1];

                return (
                  <G key={`edge-group-${index}`}>
                    {/* Vertical stem down from parent card */}
                    <Line
                      x1={edge.parentX}
                      y1={edge.parentY}
                      x2={edge.parentX}
                      y2={edge.midY}
                      stroke="#CBD5E1"
                      strokeWidth={2}
                    />

                    {/* Central circular junction dot (matches web screenshot) */}
                    <Circle
                      cx={edge.parentX}
                      cy={edge.midY}
                      r={4.5}
                      fill="#FFFFFF"
                      stroke="#C89738"
                      strokeWidth={2}
                    />

                    {/* Horizontal crossbar connecting all children */}
                    <Line
                      x1={firstChildX}
                      y1={edge.midY}
                      x2={lastChildX}
                      y2={edge.midY}
                      stroke="#CBD5E1"
                      strokeWidth={2}
                    />

                    {/* Vertical drop down to each child card */}
                    {edge.childrenCenters.map((cX, cIdx) => (
                      <G key={`child-link-${index}-${cIdx}`}>
                        <Line
                          x1={cX}
                          y1={edge.midY}
                          x2={cX}
                          y2={edge.childY}
                          stroke="#CBD5E1"
                          strokeWidth={2}
                        />
                        {/* Dot entering child card top */}
                        <Circle
                          cx={cX}
                          cy={edge.childY}
                          r={3}
                          fill="#CBD5E1"
                        />
                      </G>
                    ))}
                  </G>
                );
              })}
            </Svg>

            {/* Tree Node Cards */}
            {positions.map((node) => {
              const isMatch =
                normalizedQuery.length > 0 &&
                (node.name?.toLowerCase().includes(normalizedQuery) ||
                  node.code?.toLowerCase().includes(normalizedQuery));

              const isDimmed = normalizedQuery.length > 0 && !isMatch;
              const cardBorder = isMatch
                ? '#E64A78'
                : node.badgeColor || '#C89738';

              return (
                <TouchableOpacity
                  key={node.id}
                  activeOpacity={0.85}
                  onPress={() => onSelectMember && onSelectMember(node)}
                  style={[
                    styles.cardContainer,
                    {
                      left: node.x,
                      top: node.y,
                      borderColor: cardBorder,
                      opacity: isDimmed ? 0.35 : 1,
                    },
                    isMatch && styles.matchedCard,
                  ]}
                >
                  {/* Left: Avatar / Initials Badge */}
                  <View style={styles.avatarWrap}>
                    {node.avatar ? (
                      <Image source={{ uri: node.avatar }} style={styles.avatarImg} />
                    ) : (
                      <View
                        style={[
                          styles.initialsBadge,
                          { backgroundColor: (node.badgeColor || '#E64A78') + '18' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.initialsText,
                            { color: node.badgeColor || '#E64A78' },
                          ]}
                        >
                          {node.initials || node.name?.substring(0, 2).toUpperCase() || 'DS'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Right: Info Lines */}
                  <View style={styles.infoCol}>
                    <Text style={styles.nodeName} numberOfLines={1}>
                      {node.name}
                    </Text>

                    <Text style={styles.nodeCode} numberOfLines={1}>
                      Code: <Text style={styles.nodeCodeVal}>{node.code}</Text>
                    </Text>

                    <Text style={styles.nodeSlot} numberOfLines={1}>
                      Slot: <Text style={styles.nodeSlotVal}>{node.slot}</Text>
                    </Text>
                  </View>

                  {/* Level indicator pill */}
                  <View style={[styles.levelTag, { backgroundColor: (node.badgeColor || '#C89738') + '15' }]}>
                    <Text style={[styles.levelTagText, { color: node.badgeColor || '#C89738' }]}>
                      L{node.level}
                    </Text>
                  </View>

                  {/* Downline count indicator if has children */}
                  {node.children && node.children.length > 0 && (
                    <View style={styles.childrenPill}>
                      <Ionicons name="people" size={9} color="#64748B" />
                      <Text style={styles.childrenPillText}>{node.children.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
    zIndex: 10,
  },
  hintTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#8C6821',
  },
  zoomButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4EFF1',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  zoomBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  zoomResetBtn: {
    width: 44,
    paddingHorizontal: 4,
  },
  zoomPercentText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#2A1E24',
  },
  outerScroll: {
    flex: 1,
  },
  canvas: {
    position: 'relative',
  },
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  matchedCard: {
    borderWidth: 2.2,
    borderColor: '#E64A78',
    shadowColor: '#E64A78',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    marginRight: 9,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#F0EAED',
    backgroundColor: '#F3F4F6',
  },
  initialsBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230,74,120,0.2)',
  },
  initialsText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nodeName: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1E293B',
    marginBottom: 1,
  },
  nodeCode: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
    lineHeight: 13,
  },
  nodeCodeVal: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#E64A78', // Magenta/Rose code matching web screenshot
  },
  nodeSlot: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
    lineHeight: 14,
  },
  nodeSlotVal: {
    fontFamily: 'Poppins_700Bold',
    color: '#C89738', // Golden slot matching web screenshot
  },
  levelTag: {
    position: 'absolute',
    top: 5,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  levelTagText: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
  },
  childrenPill: {
    position: 'absolute',
    bottom: 5,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  childrenPillText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    color: '#64748B',
  },
});
