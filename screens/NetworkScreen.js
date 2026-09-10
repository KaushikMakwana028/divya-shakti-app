import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import networkService from '../services/networkService';
import storageService from '../services/storageService';

const COLOR_PALETTE = ['#E64A78', '#C89738', '#7B61C4', '#4A7CE6', '#0E9F6E', '#3F83F8'];

export default function NetworkScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [summary, setSummary] = useState({
    total_referrals: 0,
    active_referrals: 0,
    levels: 1,
  });
  const [currentUser, setCurrentUser] = useState(null);

  const fetchNetwork = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Load current user profile from storage for referral code
      const user = await storageService.getUser();
      if (user) {
        setCurrentUser(user);
      }

      // Fetch live referrals from backend API
      const res = await networkService.getReferrals();
      if (res.success) {
        setReferrals(res.referrals || []);
        if (res.summary) {
          setSummary({
            total_referrals: res.summary.total_referrals ?? res.referrals.length,
            active_referrals: res.summary.active_referrals ?? 0,
            levels: res.summary.levels ?? 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load network data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  const handleShareReferral = async () => {
    const code = currentUser?.referral_code;
    if (!code) return;
    try {
      await Share.share({
        message: `Join Divy Shakti and start your wellness & earning journey! Use my referral code: ${code}`,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const filtered = referrals.filter((m) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = m.name && m.name.toLowerCase().includes(term);
    const phoneMatch = m.phone && m.phone.toLowerCase().includes(term);
    const emailMatch = m.email && m.email.toLowerCase().includes(term);
    const idMatch = m.custom_id && m.custom_id.toLowerCase().includes(term);
    return nameMatch || phoneMatch || emailMatch || idMatch;
  });

  const handleMemberPress = (member, index) => {
    const cardColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const memberPayload = {
      ...member,
      id: member.id,
      name: member.name || 'Member',
      role: member.is_profile_active ? 'Verified Member' : 'Direct Referral',
      joined: member.joined_formatted || 'Recently',
      color: cardColor,
      phone: member.phone || 'Not provided',
      email: member.email || 'Not provided',
      earnings: member.total_spent ? `₹${member.total_spent}` : '₹0.00',
      orders: member.total_orders || 0,
      team: 0,
      status: member.status || (member.is_profile_active ? 'Active' : 'Inactive'),
    };
    navigation.navigate('MemberDetails', { member: memberPayload });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="My Network" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNetwork(true)}
            tintColor="#C89738"
            colors={['#C89738']}
          />
        }
      >
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          {[
            { label: 'Total', value: String(summary.total_referrals ?? referrals.length), icon: 'people' },
            { label: 'Active', value: String(summary.active_referrals ?? 0), icon: 'checkmark-circle' },
            { label: 'Levels', value: String(summary.levels ?? 1), icon: 'layers' },
          ].map((s, i) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <View style={styles.statIconBox}>
                  <Ionicons name={s.icon} size={16} color="#C89738" />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < 2 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#9E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID (#0002001), phone..."
            placeholderTextColor="#9E8E93"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Direct Referrals</Text>
          <Text style={styles.countText}>
            {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C89738" />
            <Text style={styles.loadingText}>Loading network members...</Text>
          </View>
        )}

        {/* Empty State: No Network at all */}
        {!loading && referrals.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="people-outline" size={44} color="#C89738" />
            </View>
            <Text style={styles.emptyTitle}>No Network Members Yet</Text>
            <Text style={styles.emptySubtitle}>
              Invite your friends and family using your referral code. When they register, they will appear here in your direct network!
            </Text>

            {currentUser?.referral_code ? (
              <View style={styles.codeShareCard}>
                <Text style={styles.codeLabel}>Your Referral Code</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.codeValue}>{currentUser.referral_code}</Text>
                </View>
                <TouchableOpacity
                  style={styles.shareBtn}
                  activeOpacity={0.8}
                  onPress={handleShareReferral}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Share Referral Code</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Empty State: Search match failure */}
        {!loading && referrals.length > 0 && filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={38} color="#9E8E93" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No Matching Members</Text>
            <Text style={styles.emptySubtitle}>
              We couldn't find anyone matching "{search}". Try searching with another name or ID.
            </Text>
          </View>
        )}

        {/* Members List */}
        {!loading &&
          filtered.map((member, i) => {
            const cardColor = COLOR_PALETTE[i % COLOR_PALETTE.length];
            const initials = member.name
              ? member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
              : 'M';
            const isActive = member.status === 'Active' || member.is_profile_active === 1;

            return (
              <TouchableOpacity
                key={member.id || i}
                style={styles.memberCard}
                activeOpacity={0.7}
                onPress={() => handleMemberPress(member, i)}
              >
                {member.profile_image ? (
                  <Image source={{ uri: member.profile_image }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: cardColor + '18' }]}>
                    <Text style={[styles.avatarText, { color: cardColor }]}>{initials}</Text>
                  </View>
                )}

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name || 'Member'}
                    </Text>
                    {member.custom_id ? (
                      <View style={styles.idTag}>
                        <Text style={styles.idTagText}>#{member.custom_id}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: isActive ? '#E8FBF5' : '#F9F9F9' },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? '#27A462' : '#9E8E93' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.roleText,
                          { color: isActive ? '#27A462' : '#9E8E93' },
                        ]}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>

                    {member.joined_formatted ? (
                      <Text style={styles.joinedText}>
                        Joined {member.joined_formatted}
                      </Text>
                    ) : null}
                  </View>

                  {member.phone ? (
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={12} color="#9E8E93" />
                      <Text style={styles.phoneText}>{member.phone}</Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => handleMemberPress(member, i)}
                >
                  <Ionicons name="chevron-forward" size={14} color="#9E8E93" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },
  statsBanner: {
    backgroundColor: '#2A1E24',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(200,151,56,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  statDivider: {
    width: 1,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
    paddingVertical: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#2A1E24',
  },
  countText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9E8E93',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#9E8E93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  codeShareCard: {
    width: '100%',
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE9EC',
  },
  codeLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#9E8E93',
    marginBottom: 4,
  },
  codeRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C89738',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  codeValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#C89738',
    letterSpacing: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C89738',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    width: '100%',
  },
  shareBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
    flex: 1,
    marginRight: 6,
  },
  idTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  idTagText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#4B5563',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
  },
  joinedText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9E8E93',
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
