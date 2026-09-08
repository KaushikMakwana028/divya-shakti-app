import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

const CATEGORIES = ['All', 'Health', 'Wellness', 'Beauty'];

const PRODUCTS = [
  { 
    id: 1,
    name: 'Energy Booster',
    category: 'Health',
    price: '₹1,299',
    oldPrice: '₹1,599',
    rating: '4.8',
    reviews: 234,
    icon: 'flash',
    color: '#E64A78',
    description: 'Boost your energy levels naturally with our premium energy supplement. Perfect for active lifestyles.',
    ingredients: ['Vitamin B12', 'Caffeine', 'Ginseng', 'Green Tea Extract'],
    inStock: true,
  },
  {
    id: 2,
    name: 'Slim Tea',
    category: 'Wellness',
    price: '₹899',
    oldPrice: '₹1,100',
    rating: '4.6',
    reviews: 189,
    icon: 'leaf',
    color: '#27A462',
    description: 'Natural weight management tea blend. Supports healthy metabolism and digestion.',
    ingredients: ['Green Tea', 'Garcinia', 'Mint', 'Lemon Grass'],
    inStock: true,
  },
  {
    id: 3,
    name: 'Glow Serum',
    category: 'Beauty',
    price: '₹1,599',
    oldPrice: '₹1,999',
    rating: '4.9',
    reviews: 412,
    icon: 'sparkles',
    color: '#C89738',
    description: 'Premium face serum for radiant, glowing skin. Reduces dark spots and improves texture.',
    ingredients: ['Vitamin C', 'Hyaluronic Acid', 'Niacinamide', 'Aloe Vera'],
    inStock: true,
  },
  {
    id: 4,
    name: 'Immunity Kit',
    category: 'Health',
    price: '₹2,199',
    oldPrice: '₹2,799',
    rating: '4.7',
    reviews: 298,
    icon: 'shield',
    color: '#4A7CE6',
    description: 'Complete immunity booster kit with essential vitamins and minerals.',
    ingredients: ['Vitamin C', 'Zinc', 'Elderberry', 'Echinacea'],
    inStock: true,
  },
  {
    id: 5,
    name: 'Calm Drops',
    category: 'Wellness',
    price: '₹749',
    oldPrice: '₹999',
    rating: '4.5',
    reviews: 156,
    icon: 'water',
    color: '#7B61C4',
    description: 'Natural stress relief drops for better sleep and relaxation.',
    ingredients: ['Lavender Oil', 'Chamomile', 'Valerian Root', 'Melatonin'],
    inStock: false,
  },
  {
    id: 6,
    name: 'Hair Growth',
    category: 'Beauty',
    price: '₹1,099',
    oldPrice: '₹1,399',
    rating: '4.6',
    reviews: 221,
    icon: 'flower',
    color: '#E64A78',
    description: 'Advanced hair growth serum with natural botanicals. Strengthens and nourishes.',
    ingredients: ['Biotin', 'Keratin', 'Argan Oil', 'Castor Oil'],
    inStock: true,
  },
];

export default function ShopScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const { getCartCount } = useCart();

  const filtered = activeCategory === 'All'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeCategory);

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const handleCartPress = () => {
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header 
        title="Shop" 
        rightIcon="bag-outline"
        onRightPress={handleCartPress}
        cartCount={getCartCount()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Offer Banner */}
        <View style={styles.offerBanner}>
          <View style={styles.offerLeft}>
            <View style={styles.goldTag}>
              <Ionicons name="star" size={10} color="#C89738" />
              <Text style={styles.goldTagText}>Royal Offer</Text>
            </View>
            <Text style={styles.offerTitle}>Get 20% OFF{'\n'}on first order</Text>
            <TouchableOpacity style={styles.offerBtn}>
              <Text style={styles.offerBtnText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.offerRight}>
            <View style={styles.offerDecorCircle}>
              <Ionicons name="gift" size={44} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <View style={styles.grid}>
          {filtered.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              activeOpacity={0.8}
              onPress={() => handleProductPress(product)}
            >
              {/* Discount badge */}
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>20% OFF</Text>
              </View>

              {/* Product Visual */}
              <View style={[styles.productVisual, { backgroundColor: product.color + '12' }]}>
                <Ionicons name={product.icon} size={44} color={product.color} />
              </View>

              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>

                {/* Rating */}
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color="#C89738" />
                  <Text style={styles.ratingText}>{product.rating}</Text>
                </View>

                {/* Price Row */}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{product.price}</Text>
                  <Text style={styles.oldPrice}>{product.oldPrice}</Text>
                </View>

                {/* Add Button */}
                <TouchableOpacity
                  style={styles.addBtn}
                  activeOpacity={0.8}
                  onPress={() => handleProductPress(product)}
                >
                  <Ionicons name="bag-add-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },

  /* Offer Banner */
  offerBanner: {
    backgroundColor: '#2A1E24',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  offerLeft: { flex: 1 },
  goldTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(200,151,56,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(200,151,56,0.35)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  goldTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#C89738',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  offerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 14,
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E64A78',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  offerBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  offerRight: {
    paddingLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerDecorCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(230,74,120,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Categories */
  catsRow: {
    gap: 8,
    paddingVertical: 2,
    marginBottom: 18,
  },
  catChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F0EAED',
  },
  catChipActive: {
    backgroundColor: '#E64A78',
    borderColor: '#E64A78',
  },
  catText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#9E8E93',
  },
  catTextActive: {
    color: '#FFFFFF',
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: '#C89738',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  productVisual: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    padding: 12,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
    marginBottom: 2,
  },
  productCategory: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#9E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  ratingText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#C89738',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  price: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#2A1E24',
  },
  oldPrice: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
    textDecorationLine: 'line-through',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#E64A78',
    borderRadius: 12,
    paddingVertical: 9,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});