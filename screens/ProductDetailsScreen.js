import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';

export default function ProductDetailsScreen({ route, navigation }) {
    const { product } = route.params;
    const { addToCart, getCartCount } = useCart();
    const [quantity, setQuantity] = useState(1);

    const handleAddToCart = () => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product);
        }
        Alert.alert(
            'Added to Cart',
            `${product.name} (${quantity}) added to your cart!`,
            [
                { text: 'Continue Shopping', style: 'cancel' },
                { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
            ]
        );
    };

    const handleBuyNow = () => {
        handleAddToCart();
        navigation.navigate('Cart');
    };

    const handleCartPress = () => {
        navigation.navigate('Cart');
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Header
                title="Product Details"
                showBack={true}
                rightIcon="bag-outline"
                onRightPress={handleCartPress}
                cartCount={getCartCount()}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >
                {/* Product Image Section */}
                <View style={[styles.imageCard, { backgroundColor: product.color + '15' }]}>
                    <View style={styles.discountTag}>
                        <Text style={styles.discountTagText}>20% OFF</Text>
                    </View>
                    <Ionicons name={product.icon} size={120} color={product.color} />
                </View>

                {/* Product Info */}
                <View style={styles.infoSection}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{product.category}</Text>
                    </View>

                    <Text style={styles.productName}>{product.name}</Text>

                    {/* Rating & Reviews */}
                    <View style={styles.ratingRow}>
                        <View style={styles.ratingBox}>
                            <Ionicons name="star" size={14} color="#C89738" />
                            <Text style={styles.ratingText}>{product.rating}</Text>
                        </View>
                        <Text style={styles.reviewsText}>({product.reviews} reviews)</Text>
                        {product.inStock ? (
                            <View style={styles.stockBadge}>
                                <View style={styles.stockDot} />
                                <Text style={styles.stockText}>In Stock</Text>
                            </View>
                        ) : (
                            <View style={[styles.stockBadge, { backgroundColor: '#FFE8ED' }]}>
                                <View style={[styles.stockDot, { backgroundColor: '#E64A78' }]} />
                                <Text style={[styles.stockText, { color: '#E64A78' }]}>Out of Stock</Text>
                            </View>
                        )}
                    </View>

                    {/* Price */}
                    <View style={styles.priceSection}>
                        <Text style={styles.price}>{product.price}</Text>
                        <Text style={styles.oldPrice}>{product.oldPrice}</Text>
                        <View style={styles.saveBadge}>
                            <Text style={styles.saveText}>Save 20%</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{product.description}</Text>

                    {/* Ingredients */}
                    <Text style={styles.sectionTitle}>Key Ingredients</Text>
                    <View style={styles.ingredientsGrid}>
                        {product.ingredients.map((ingredient, i) => (
                            <View key={i} style={styles.ingredientChip}>
                                <Ionicons name="checkmark-circle" size={14} color="#27A462" />
                                <Text style={styles.ingredientText}>{ingredient}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Quantity Selector */}
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <View style={styles.quantityRow}>
                        <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                            <Ionicons name="remove" size={18} color="#2A1E24" />
                        </TouchableOpacity>
                        <View style={styles.quantityBox}>
                            <Text style={styles.quantityText}>{quantity}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.quantityBtn}
                            onPress={() => setQuantity(quantity + 1)}
                        >
                            <Ionicons name="add" size={18} color="#2A1E24" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.addToCartBtn}
                    onPress={handleAddToCart}
                    disabled={!product.inStock}
                >
                    <Ionicons name="bag-add-outline" size={20} color="#E64A78" />
                    <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.buyNowBtn, !product.inStock && styles.buyNowBtnDisabled]}
                    onPress={handleBuyNow}
                    disabled={!product.inStock}
                >
                    <Ionicons name="flash" size={20} color="#FFFFFF" />
                    <Text style={styles.buyNowText}>Buy Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FAF7F8',
    },
    container: {
        paddingBottom: 100,
    },
    imageCard: {
        margin: 20,
        borderRadius: 28,
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    discountTag: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: '#C89738',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    discountTagText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 11,
        color: '#FFFFFF',
    },
    infoSection: {
        paddingHorizontal: 20,
    },
    categoryBadge: {
        backgroundColor: '#FFF0F4',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    categoryText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#E64A78',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    productName: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 26,
        color: '#2A1E24',
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FBF5E6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    ratingText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
        color: '#C89738',
    },
    reviewsText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
        color: '#9E8E93',
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E8FBF5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginLeft: 'auto',
    },
    stockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#27A462',
    },
    stockText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 11,
        color: '#27A462',
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    price: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 28,
        color: '#2A1E24',
    },
    oldPrice: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 16,
        color: '#9E8E93',
        textDecorationLine: 'line-through',
    },
    saveBadge: {
        backgroundColor: '#E8FBF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    saveText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 11,
        color: '#27A462',
    },
    sectionTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#2A1E24',
        marginBottom: 12,
        marginTop: 8,
    },
    description: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 14,
        color: '#9E8E93',
        lineHeight: 24,
        marginBottom: 16,
    },
    ingredientsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    ingredientChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0EAED',
    },
    ingredientText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        color: '#2A1E24',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    quantityBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0EAED',
    },
    quantityBox: {
        minWidth: 60,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#E64A78',
    },
    quantityText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
        color: '#2A1E24',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0EAED',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 10,
    },
    addToCartBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFF0F4',
        borderRadius: 16,
        paddingVertical: 16,
        borderWidth: 1.5,
        borderColor: '#E64A78',
    },
    addToCartText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#E64A78',
    },
    buyNowBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#E64A78',
        borderRadius: 16,
        paddingVertical: 16,
        shadowColor: '#E64A78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buyNowBtnDisabled: {
        backgroundColor: '#C5B8BD',
        shadowOpacity: 0,
    },
    buyNowText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#FFFFFF',
    },
});