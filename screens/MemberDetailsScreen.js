import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Image,
    ActivityIndicator,
    RefreshControl,
    Share,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Header from '../components/Header';
import API_CONFIG from '../config/api';
import networkService from '../services/networkService';

export default function MemberDetailsScreen({ route, navigation }) {
    const { member: initialMember } = route.params || {};

    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [sponsorImgError, setSponsorImgError] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    // Target member ID
    const memberId = initialMember?.id || initialMember?.user_id;

    // Fetch real member details & hierarchy from API
    const fetchMemberDetails = useCallback(async (isRefresh = false) => {
        if (!memberId) {
            setLoading(false);
            return;
        }

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await networkService.getMemberDetails(memberId);
            if (res && res.success && res.data) {
                setLiveData(res.data);
            }
        } catch (err) {
            console.error('Failed to load real member details:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [memberId]);

    useEffect(() => {
        fetchMemberDetails(false);
    }, [fetchMemberDetails]);

    // Active member merged between navigation preview and live API data
    const activeMember = {
        ...initialMember,
        ...(liveData?.member || {}),
    };

    const sponsor = liveData?.sponsor || null;
    const directMembers = liveData?.direct_members || [];

    const stats = liveData?.stats || {
        wallet_balance: initialMember?.earnings || (initialMember?.wallet_balance ? `₹${initialMember.wallet_balance}` : '₹0.00'),
        total_earnings: initialMember?.earnings || (initialMember?.wallet_balance ? `₹${initialMember.wallet_balance}` : '₹0.00'),
        total_orders: initialMember?.orders ?? 0,
        total_spent: '₹0.00',
        direct_team: initialMember?.team ?? 0,
        active_direct: initialMember?.active_team ?? 0,
        total_team: initialMember?.team ?? 0,
        active_team: initialMember?.active_team ?? 0,
    };

    const getAvatarUri = (raw) => {
        if (!raw || typeof raw !== 'string' || raw === 'null' || raw === 'undefined' || raw.trim() === '') {
            return null;
        }

        const cleanBase = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');

        if (raw.includes('localhost') || raw.includes('127.0.0.1') || raw.includes('10.0.2.2')) {
            const uploadsIdx = raw.indexOf('uploads/');
            if (uploadsIdx !== -1) {
                return `${cleanBase}/${raw.substring(uploadsIdx)}`;
            }
        }

        if (raw.startsWith('http://divyshakti.visiontechnolabs.com')) {
            return raw.replace('http://', 'https://');
        }

        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            return raw;
        }

        const cleanPath = raw.replace(/^\/+/, '');
        return `${cleanBase}/${cleanPath}`;
    };

    const avatarUri = getAvatarUri(activeMember.profile_image || activeMember.avatar);
    const sponsorAvatarUri = getAvatarUri(sponsor?.profile_image);

    const memberName = activeMember.name || 'Member';
    const memberColor = activeMember.color || activeMember.badgeColor || '#C89738';
    const memberCode = activeMember.referral_code || activeMember.code || '';
    const customId = activeMember.custom_id || (activeMember.id ? String(activeMember.id).padStart(7, '0') : '');
    const isMemberActive = Boolean(activeMember.is_profile_active || activeMember.status === 'Active');
    const completionPct = activeMember.profile_completion_percentage ?? (isMemberActive ? 100 : 80);

    const initials =
        activeMember.initials ||
        memberName
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() ||
        'DS';

    // Clipboard copy handler
    const handleCopy = async (text, fieldKey) => {
        if (!text || text === 'Not provided') return;
        await Clipboard.setStringAsync(String(text));
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Quick Actions
    const handleCall = () => {
        const phone = activeMember.phone;
        if (phone && phone !== 'Not provided' && phone.trim() !== '') {
            Linking.openURL(`tel:${phone}`);
        } else {
            Alert.alert('Phone Unavailable', 'This member has not provided a contact phone number.');
        }
    };

    const handleWhatsApp = () => {
        const phone = activeMember.phone;
        if (phone && phone !== 'Not provided' && phone.trim() !== '') {
            const cleanDigits = phone.replace(/\D/g, '');
            const finalNum = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
            Linking.openURL(`whatsapp://send?phone=${finalNum}&text=Hello%20${encodeURIComponent(memberName)}`);
        } else {
            Alert.alert('Phone Unavailable', 'Cannot initiate WhatsApp message without a phone number.');
        }
    };

    const handleEmail = () => {
        const email = activeMember.email;
        if (email && email !== 'Not provided' && email.trim() !== '') {
            Linking.openURL(`mailto:${email}`);
        } else {
            Alert.alert('Email Unavailable', 'This member has not provided an email address.');
        }
    };

    const handleShare = async () => {
        try {
            const msg = `*Member Profile: ${memberName}*\nReferral Code: ${memberCode || 'N/A'}\nMember ID: ${customId || 'N/A'}\nStatus: ${isMemberActive ? 'Active' : 'Pending'}\nDivy Shakti Community`;
            await Share.share({ message: msg });
        } catch (e) {
            console.error('Share error:', e);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Header
                title="Member Details"
                showBack={true}
                rightIcon="share-social-outline"
                onRightPress={handleShare}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchMemberDetails(true)}
                        tintColor="#C89738"
                        colors={['#C89738', '#E64A78']}
                    />
                }
            >
                {/* ─────────────────────────────────────────────
                    1. Premium Profile Hero Card
                ───────────────────────────────────────────── */}
                <View style={styles.profileCard}>
                    {/* Top Status & Role Bar */}
                    <View style={styles.profileTopRow}>
                        <View style={[styles.statusPill, { backgroundColor: isMemberActive ? '#E8FBF5' : '#FFF5E6' }]}>
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: isMemberActive ? '#0E9F6E' : '#D97706' },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.statusPillText,
                                    { color: isMemberActive ? '#0E9F6E' : '#D97706' },
                                ]}
                            >
                                {isMemberActive ? 'Verified & Active' : 'Pending KYC'}
                            </Text>
                        </View>

                        {activeMember.role ? (
                            <View style={[styles.roleBadge, { backgroundColor: memberColor + '18' }]}>
                                <Ionicons name="shield-checkmark" size={11} color={memberColor} />
                                <Text style={[styles.roleText, { color: memberColor }]}>
                                    {activeMember.role}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Avatar with Status Ring */}
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarRing, { borderColor: isMemberActive ? '#0E9F6E' : memberColor }]}>
                            {avatarUri && !imgError ? (
                                <Image
                                    source={{ uri: avatarUri }}
                                    style={styles.avatarImg}
                                    resizeMode="cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: memberColor + '18' }]}>
                                    <Text style={[styles.avatarText, { color: memberColor }]}>
                                        {initials}
                                    </Text>
                                </View>
                            )}
                        </View>
                        {isMemberActive && (
                            <View style={styles.verifiedIconBadge}>
                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                            </View>
                        )}
                    </View>

                    <Text style={styles.memberName}>{memberName}</Text>

                    {/* Identifiers Row (Referral Code & Member ID) */}
                    <View style={styles.chipsRow}>
                        {memberCode ? (
                            <TouchableOpacity
                                style={styles.identifierChip}
                                activeOpacity={0.7}
                                onPress={() => handleCopy(memberCode, 'code')}
                            >
                                <Ionicons name="pricetag-outline" size={12} color="#E64A78" />
                                <Text style={styles.chipLabel}>Code: </Text>
                                <Text style={styles.chipValue}>{memberCode}</Text>
                                <Ionicons
                                    name={copiedField === 'code' ? 'checkmark' : 'copy-outline'}
                                    size={12}
                                    color={copiedField === 'code' ? '#0E9F6E' : '#9E8E93'}
                                    style={{ marginLeft: 2 }}
                                />
                            </TouchableOpacity>
                        ) : null}

                        {customId ? (
                            <TouchableOpacity
                                style={styles.identifierChip}
                                activeOpacity={0.7}
                                onPress={() => handleCopy(customId, 'id')}
                            >
                                <Ionicons name="finger-print-outline" size={12} color="#C89738" />
                                <Text style={styles.chipLabel}>ID: </Text>
                                <Text style={styles.chipValue}>{customId}</Text>
                                <Ionicons
                                    name={copiedField === 'id' ? 'checkmark' : 'copy-outline'}
                                    size={12}
                                    color={copiedField === 'id' ? '#0E9F6E' : '#9E8E93'}
                                    style={{ marginLeft: 2 }}
                                />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Copied Feedback Toast */}
                    {copiedField && (
                        <View style={styles.copiedBanner}>
                            <Ionicons name="checkmark-circle" size={13} color="#0E9F6E" />
                            <Text style={styles.copiedBannerText}>
                                {copiedField === 'code' ? 'Referral Code copied to clipboard!' : 'Member ID copied!'}
                            </Text>
                        </View>
                    )}

                    {/* Profile Completion Bar */}
                    <View style={styles.profileProgressBox}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Profile & KYC Progress</Text>
                            <Text style={[styles.progressPctText, { color: completionPct >= 100 ? '#0E9F6E' : '#C89738' }]}>
                                {completionPct}%
                            </Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min(Math.max(completionPct, 15), 100)}%`,
                                        backgroundColor: completionPct >= 100 ? '#0E9F6E' : '#C89738',
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </View>

                {/* ─────────────────────────────────────────────
                    2. Performance Metrics Grid (4-Box)
                ───────────────────────────────────────────── */}
                <Text style={styles.sectionHeaderTitle}>Performance Overview</Text>

                <View style={styles.metricsGrid}>
                    {/* Wallet Earnings */}
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#FBF5E6' }]}>
                            <Ionicons name="wallet" size={18} color="#C89738" />
                        </View>
                        <Text style={styles.metricValue} numberOfLines={1}>
                            {stats.wallet_balance}
                        </Text>
                        <Text style={styles.metricLabel}>Wallet Balance</Text>
                        <Text style={styles.metricSub}>Slot: {stats.total_earnings}</Text>
                    </View>

                    {/* Orders Placed */}
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#FFF0F4' }]}>
                            <Ionicons name="bag-handle" size={18} color="#E64A78" />
                        </View>
                        <Text style={styles.metricValue}>
                            {stats.total_orders}
                        </Text>
                        <Text style={styles.metricLabel}>Orders Placed</Text>
                        <Text style={styles.metricSub}>{stats.total_spent !== '₹0.00' ? stats.total_spent : 'Purchases'}</Text>
                    </View>

                    {/* Direct Team */}
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#EEF5FF' }]}>
                            <Ionicons name="people" size={18} color="#4A7CE6" />
                        </View>
                        <Text style={styles.metricValue}>
                            {stats.direct_team}
                        </Text>
                        <Text style={styles.metricLabel}>Direct Referrals</Text>
                        <Text style={styles.metricSub}>{stats.active_direct} Active</Text>
                    </View>

                    {/* Total Downline Network */}
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#F5F0FF' }]}>
                            <Ionicons name="git-network-outline" size={18} color="#7B61C4" />
                        </View>
                        <Text style={styles.metricValue}>
                            {stats.total_team}
                        </Text>
                        <Text style={styles.metricLabel}>Total Downline</Text>
                        <Text style={styles.metricSub}>{stats.active_team} Active</Text>
                    </View>
                </View>

                {/* ─────────────────────────────────────────────
                    3. Sponsor / Introducer Info
                ───────────────────────────────────────────── */}
                {sponsor && (
                    <>
                        <Text style={styles.sectionHeaderTitle}>Introduced By / Sponsor</Text>
                        <View style={styles.sponsorCard}>
                            <View style={styles.sponsorAvatarRing}>
                                {sponsorAvatarUri && !sponsorImgError ? (
                                    <Image
                                        source={{ uri: sponsorAvatarUri }}
                                        style={styles.sponsorAvatar}
                                        onError={() => setSponsorImgError(true)}
                                    />
                                ) : (
                                    <View style={styles.sponsorFallback}>
                                        <Text style={styles.sponsorFallbackText}>{sponsor.initials || 'SP'}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.sponsorInfo}>
                                <Text style={styles.sponsorName} numberOfLines={1}>
                                    {sponsor.name}
                                </Text>
                                <Text style={styles.sponsorMeta}>
                                    Code: <Text style={styles.sponsorCodeVal}>{sponsor.referral_code}</Text> • ID: {sponsor.custom_id}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.sponsorActionBtn}
                                activeOpacity={0.7}
                                onPress={() => handleCopy(sponsor.referral_code, 'sponsor')}
                            >
                                <Ionicons name="copy-outline" size={16} color="#C89738" />
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* ─────────────────────────────────────────────
                    4. Contact Information Card
                ───────────────────────────────────────────── */}
                <Text style={styles.sectionHeaderTitle}>Contact Information</Text>

                <View style={styles.infoCard}>
                    {/* Phone */}
                    <TouchableOpacity
                        style={styles.infoRow}
                        activeOpacity={0.7}
                        onPress={handleCall}
                    >
                        <View style={[styles.infoIconBox, { backgroundColor: '#EEF5FF' }]}>
                            <Ionicons name="call" size={17} color="#4A7CE6" />
                        </View>
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Phone Number</Text>
                            <Text style={styles.infoValue}>
                                {activeMember.phone || 'Not provided'}
                            </Text>
                        </View>
                        {activeMember.phone && activeMember.phone !== 'Not provided' ? (
                            <View style={styles.infoActionPill}>
                                <Text style={styles.infoActionText}>Call</Text>
                                <Ionicons name="chevron-forward" size={13} color="#4A7CE6" />
                            </View>
                        ) : null}
                    </TouchableOpacity>

                    <View style={styles.infoDivider} />

                    {/* Email */}
                    <TouchableOpacity
                        style={styles.infoRow}
                        activeOpacity={0.7}
                        onPress={handleEmail}
                    >
                        <View style={[styles.infoIconBox, { backgroundColor: '#FFF0F4' }]}>
                            <Ionicons name="mail" size={17} color="#E64A78" />
                        </View>
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>
                                {activeMember.email || 'Not provided'}
                            </Text>
                        </View>
                        {activeMember.email && activeMember.email !== 'Not provided' ? (
                            <View style={styles.infoActionPill}>
                                <Text style={styles.infoActionText}>Email</Text>
                                <Ionicons name="chevron-forward" size={13} color="#E64A78" />
                            </View>
                        ) : null}
                    </TouchableOpacity>
                </View>

                {/* ─────────────────────────────────────────────
                    5. Quick Actions Row
                ───────────────────────────────────────────── */}
                <Text style={styles.sectionHeaderTitle}>Quick Actions</Text>

                <View style={styles.actionsBar}>
                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.8}
                        onPress={handleCall}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: '#EEF5FF' }]}>
                            <Ionicons name="call" size={20} color="#4A7CE6" />
                        </View>
                        <Text style={styles.actionItemText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.8}
                        onPress={handleWhatsApp}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: '#E8FBF5' }]}>
                            <Ionicons name="logo-whatsapp" size={20} color="#0E9F6E" />
                        </View>
                        <Text style={styles.actionItemText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.8}
                        onPress={handleEmail}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: '#FFF0F4' }]}>
                            <Ionicons name="mail" size={20} color="#E64A78" />
                        </View>
                        <Text style={styles.actionItemText}>Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionItem}
                        activeOpacity={0.8}
                        onPress={handleShare}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: '#FBF5E6' }]}>
                            <Ionicons name="share-social" size={20} color="#C89738" />
                        </View>
                        <Text style={styles.actionItemText}>Share</Text>
                    </TouchableOpacity>
                </View>

                {/* ─────────────────────────────────────────────
                    6. Direct Team Members List (Replaced Recent Activity)
                ───────────────────────────────────────────── */}
                <View style={styles.teamHeaderRow}>
                    <Text style={styles.sectionHeaderTitle}>Direct Team Members</Text>
                    <View style={styles.teamCountBadge}>
                        <Ionicons name="people" size={11} color="#C89738" />
                        <Text style={styles.teamCountText}>{directMembers.length} Referrals</Text>
                    </View>
                </View>

                {loading && !refreshing && directMembers.length === 0 ? (
                    <View style={styles.teamLoadingBox}>
                        <ActivityIndicator size="small" color="#C89738" />
                        <Text style={styles.teamLoadingText}>Loading direct team members...</Text>
                    </View>
                ) : directMembers.length === 0 ? (
                    <View style={styles.emptyTeamCard}>
                        <View style={styles.emptyTeamIconWrap}>
                            <Ionicons name="people-outline" size={32} color="#C89738" />
                        </View>
                        <Text style={styles.emptyTeamTitle}>No Direct Referrals Yet</Text>
                        <Text style={styles.emptyTeamSubtitle}>
                            Members who register using {memberName}'s referral code will automatically appear here.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.directMembersListContainer}>
                        {directMembers.map((item, idx) => {
                            const dmColor = item.badgeColor || '#C89738';
                            return (
                                <TouchableOpacity
                                    key={item.id || idx}
                                    style={styles.memberListItem}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.push('MemberDetails', { member: item })}
                                >
                                    {/* Avatar */}
                                    <View style={[styles.memberListAvatarWrap, { borderColor: dmColor + '40' }]}>
                                        {item.profile_image ? (
                                            <Image source={{ uri: item.profile_image }} style={styles.memberListAvatarImg} />
                                        ) : (
                                            <View style={[styles.memberListInitials, { backgroundColor: dmColor + '18' }]}>
                                                <Text style={[styles.memberListInitialsText, { color: dmColor }]}>
                                                    {item.initials || 'DS'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Details */}
                                    <View style={styles.memberListInfo}>
                                        <Text style={styles.memberListName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <View style={styles.memberListMetaRow}>
                                            <Text style={styles.memberListCodeText}>
                                                Code: <Text style={{ color: '#E64A78', fontFamily: 'Poppins_600SemiBold' }}>{item.referral_code}</Text>
                                            </Text>
                                            <Text style={styles.memberListMetaDivider}>•</Text>
                                            <Text style={styles.memberListJoinedText}>{item.joined}</Text>
                                        </View>
                                    </View>

                                    {/* Status Badge */}
                                    <View style={[styles.memberListStatusBadge, { backgroundColor: item.is_active ? '#E8FBF5' : '#FFF5E6' }]}>
                                        <Text style={[styles.memberListStatusText, { color: item.is_active ? '#0E9F6E' : '#D97706' }]}>
                                            {item.is_active ? 'Active' : 'Pending'}
                                        </Text>
                                    </View>

                                    <Ionicons name="chevron-forward" size={15} color="#CBD5E1" style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ─────────────────────────────────────────────
                    7. Team Coordination & Support Banner
                ───────────────────────────────────────────── */}
                <View style={styles.supportBannerCard}>
                    <View style={styles.supportBannerIconBox}>
                        <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.supportBannerContent}>
                        <Text style={styles.supportBannerTitle}>Team Support & Guidance</Text>
                        <Text style={styles.supportBannerText}>
                            Help {memberName} complete orders, activate member slots, and expand downline tiers.
                        </Text>
                        <View style={styles.supportActionsRow}>
                            <TouchableOpacity
                                style={styles.supportBtnPrimary}
                                activeOpacity={0.8}
                                onPress={handleWhatsApp}
                            >
                                <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                                <Text style={styles.supportBtnText}>WhatsApp Chat</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.supportBtnSecondary}
                                activeOpacity={0.8}
                                onPress={handleCall}
                            >
                                <Ionicons name="call" size={14} color="#C89738" />
                                <Text style={styles.supportBtnSecText}>Call Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },

    /* ── 1. Hero Profile Card ── */
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingVertical: 22,
        paddingHorizontal: 18,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F0EAED',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    profileTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    statusPillText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 11,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    roleText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 11,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 14,
    },
    avatarRing: {
        width: 88,
        height: 88,
        borderRadius: 26,
        borderWidth: 2.5,
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 28,
    },
    verifiedIconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#0E9F6E',
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberName: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 20,
        color: '#2A1E24',
        textAlign: 'center',
        marginBottom: 10,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    identifierChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F0EAED',
        gap: 4,
    },
    chipLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#8C6821',
    },
    chipValue: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        color: '#2A1E24',
    },
    copiedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8FBF5',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
        marginBottom: 10,
    },
    copiedBannerText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#0E9F6E',
    },
    profileProgressBox: {
        width: '100%',
        backgroundColor: '#FBF9FA',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#F0EAED',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#64748B',
    },
    progressPctText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#E8DFE2',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },

    /* ── Section Title ── */
    sectionHeaderTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 15,
        color: '#2A1E24',
        marginBottom: 12,
        marginTop: 6,
    },

    /* ── 2. Performance Metrics Grid ── */
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    metricCard: {
        width: '48.4%',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0EAED',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    metricIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    metricValue: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
        color: '#2A1E24',
        marginBottom: 2,
    },
    metricLabel: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#64748B',
        marginBottom: 2,
    },
    metricSub: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 10,
        color: '#9E8E93',
    },

    /* ── 3. Sponsor Card ── */
    sponsorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0EAED',
        marginBottom: 20,
        gap: 12,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    sponsorAvatarRing: {
        width: 44,
        height: 44,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#C89738',
    },
    sponsorAvatar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    sponsorFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FAF5EA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sponsorFallbackText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
        color: '#C89738',
    },
    sponsorInfo: {
        flex: 1,
    },
    sponsorName: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#2A1E24',
        marginBottom: 2,
    },
    sponsorMeta: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#64748B',
    },
    sponsorCodeVal: {
        fontFamily: 'Poppins_600SemiBold',
        color: '#E64A78',
    },
    sponsorActionBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FAF5EA',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── 4. Contact Information Card ── */
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#F0EAED',
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#F0EAED',
        marginHorizontal: 14,
    },
    infoIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoCol: {
        flex: 1,
    },
    infoLabel: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#9E8E93',
        marginBottom: 1,
    },
    infoValue: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#2A1E24',
    },
    infoActionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    infoActionText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#64748B',
    },

    /* ── 5. Quick Actions Bar ── */
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 22,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0EAED',
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    actionItem: {
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    actionIconWrap: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionItemText: {
        fontFamily: 'Poppins_500Medium',
        fontSize: 11,
        color: '#2A1E24',
    },

    /* ── 6. Direct Team Members List ── */
    teamHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    teamCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
    },
    teamCountText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 11,
        color: '#8C6821',
    },
    teamLoadingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 24,
    },
    teamLoadingText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
        color: '#8C6821',
    },
    emptyTeamCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F0EAED',
        marginBottom: 20,
    },
    emptyTeamIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FAF5EA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    emptyTeamTitle: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
        color: '#2A1E24',
        marginBottom: 4,
    },
    emptyTeamSubtitle: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#9E8E93',
        textAlign: 'center',
        lineHeight: 16,
    },
    directMembersListContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#F0EAED',
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    memberListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F4F6',
    },
    memberListAvatarWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1.5,
        marginRight: 12,
        overflow: 'hidden',
    },
    memberListAvatarImg: {
        width: '100%',
        height: '100%',
    },
    memberListInitials: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberListInitialsText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    memberListInfo: {
        flex: 1,
    },
    memberListName: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 13,
        color: '#2A1E24',
        marginBottom: 2,
    },
    memberListMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    memberListCodeText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#64748B',
    },
    memberListMetaDivider: {
        color: '#CBD5E1',
        fontSize: 10,
    },
    memberListJoinedText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 10,
        color: '#9E8E93',
    },
    memberListStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    memberListStatusText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 10,
    },

    /* ── 7. Team Coordination & Support Banner ── */
    supportBannerCard: {
        backgroundColor: '#2A1E24',
        borderRadius: 20,
        padding: 18,
        marginBottom: 10,
        shadowColor: '#2A1E24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    supportBannerIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(200, 151, 56, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    supportBannerContent: {
        width: '100%',
    },
    supportBannerTitle: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    supportBannerText: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        color: '#E8DFE2',
        lineHeight: 16,
        marginBottom: 14,
    },
    supportActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    supportBtnPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#0E9F6E',
        paddingVertical: 10,
        borderRadius: 12,
    },
    supportBtnText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    supportBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(200, 151, 56, 0.4)',
        paddingVertical: 10,
        borderRadius: 12,
    },
    supportBtnSecText: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
        color: '#FBF5E6',
    },
});