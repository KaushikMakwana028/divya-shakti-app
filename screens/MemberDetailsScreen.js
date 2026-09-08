import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';

export default function MemberDetailsScreen({ route, navigation }) {
    const { member } = route.params;

    const handleCall = () => {
        Linking.openURL(`tel:${member.phone}`);
    };

    const handleEmail = () => {
        Linking.openURL(`mailto:${member.email}`);
    };

    const handleWhatsApp = () => {
        const phoneNumber = member.phone.replace(/\D/g, '');
        Linking.openURL(`whatsapp://send?phone=${phoneNumber}`);
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Header title="Member Details" showBack={true} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={[styles.avatar, { backgroundColor: member.color + '18' }]}>
                        <Text style={[styles.avatarText, { color: member.color }]}>
                            {member.name.split(' ').map((n) => n[0]).join('')}
                        </Text>
                    </View>

                    <Text style={styles.memberName}>{member.name}</Text>

                    <View style={[styles.roleBadge, { backgroundColor: member.color + '15' }]}>
                        <Ionicons name="star" size={11} color={member.color} />
                        <Text style={[styles.roleText, { color: member.color }]}>
                            {member.role}
                        </Text>
                    </View>

                    <View style={styles.statusRow}>
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: member.status === 'Active' ? '#27A462' : '#9E8E93' },
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                { color: member.status === 'Active' ? '#27A462' : '#9E8E93' },
                            ]}
                        >
                            {member.status}
                        </Text>
                        <Text style={styles.joinedDate}>· Joined {member.joined}</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBox, { backgroundColor: '#FFF0F4' }]}>
                            <Ionicons name="trending-up" size={18} color="#E64A78" />
                        </View>
                        <Text style={styles.statValue}>{member.earnings}</Text>
                        <Text style={styles.statLabel}>Total Earnings</Text>
                    </View>

                    <View style={styles.statBox}>
                        <View style={[styles.statIconBox, { backgroundColor: '#FBF5E6' }]}>
                            <Ionicons name="bag-outline" size={18} color="#C89738" />
                        </View>
                        <Text style={styles.statValue}>{member.orders}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>

                    <View style={styles.statBox}>
                        <View style={[styles.statIconBox, { backgroundColor: '#EEF5FF' }]}>
                            <Ionicons name="people-outline" size={18} color="#4A7CE6" />
                        </View>
                        <Text style={styles.statValue}>{member.team}</Text>
                        <Text style={styles.statLabel}>Team Size</Text>
                    </View>
                </View>

                {/* Contact Section */}
                <Text style={styles.sectionTitle}>Contact Information</Text>

                <View style={styles.contactCard}>
                    {/* Phone */}
                    <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
                        <View style={[styles.contactIcon, { backgroundColor: '#EEF5FF' }]}>
                            <Ionicons name="call" size={18} color="#4A7CE6" />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Phone Number</Text>
                            <Text style={styles.contactValue}>{member.phone}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9E8E93" />
                    </TouchableOpacity>

                    <View style={styles.contactDivider} />

                    {/* Email */}
                    <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
                        <View style={[styles.contactIcon, { backgroundColor: '#FFF0F4' }]}>
                            <Ionicons name="mail" size={18} color="#E64A78" />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Email Address</Text>
                            <Text style={styles.contactValue} numberOfLines={1}>
                                {member.email}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9E8E93" />
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                        <View style={[styles.actionIcon, { backgroundColor: '#EEF5FF' }]}>
                            <Ionicons name="call" size={20} color="#4A7CE6" />
                        </View>
                        <Text style={styles.actionLabel}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E8FBF5' }]}>
                            <Ionicons name="logo-whatsapp" size={20} color="#27A462" />
                        </View>
                        <Text style={styles.actionLabel}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleEmail}>
                        <View style={[styles.actionIcon, { backgroundColor: '#FFF0F4' }]}>
                            <Ionicons name="mail" size={20} color="#E64A78" />
                        </View>
                        <Text style={styles.actionLabel}>Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn}>
                        <View style={[styles.actionIcon, { backgroundColor: '#FBF5E6' }]}>
                            <Ionicons name="share-social" size={20} color="#C89738" />
                        </View>
                        <Text style={styles.actionLabel}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* Activity */}
                <Text style={styles.sectionTitle}>Recent Activity</Text>

                {[
                    {
                        icon: 'bag',
                        title: 'New Order Placed',
                        date: '2 hours ago',
                        bg: '#FFF0F4',
                        color: '#E64A78',
                    },
                    {
                        icon: 'people',
                        title: 'Added 2 New Members',
                        date: 'Yesterday',
                        bg: '#EEF5FF',
                        color: '#4A7CE6',
                    },
                    {
                        icon: 'trending-up',
                        title: 'Earned Commission',
                        date: '3 days ago',
                        bg: '#FBF5E6',
                        color: '#C89738',
                    },
                ].map((activity, i) => (
                    <View key={i} style={styles.activityCard}>
                        <View style={[styles.activityIcon, { backgroundColor: activity.bg }]}>
                            <Ionicons name={activity.icon} size={18} color={activity.color} />
                        </View>
                        <View style={styles.activityInfo}>
                            <Text style={styles.activityTitle}>{activity.title}</Text>
                            <Text style={styles.activityDate}>{activity.date}</Text>
                        </View>
                    </View>
                ))}
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
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* Profile Card */
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 32,
    },
    memberName: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        color: '#2A1E24',
        marginBottom: 10,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    roleText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    joinedDate: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
        color: '#9E8E93',
    },

    /* Stats Grid */
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    statIconBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
        color: '#2A1E24',
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 10,
        color: '#9E8E93',
        textAlign: 'center',
    },

    /* Section Title */
    sectionTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 16,
        color: '#2A1E24',
        marginBottom: 12,
    },

    /* Contact Card */
    contactCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    contactDivider: {
        height: 1,
        backgroundColor: '#F0EAED',
        marginHorizontal: 16,
    },
    contactIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactInfo: {
        flex: 1,
    },
    contactLabel: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#9E8E93',
        marginBottom: 3,
    },
    contactValue: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#2A1E24',
    },

    /* Actions */
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 8,
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#2A1E24',
    },

    /* Activity */
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    activityIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 13,
        color: '#2A1E24',
        marginBottom: 3,
    },
    activityDate: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#9E8E93',
    },
});