import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import NetworkTreeGraph from '../components/NetworkTreeGraph';
import networkService from '../services/networkService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLOR_PALETTE = ['#E64A78', '#C89738', '#7B61C4', '#4A7CE6', '#0E9F6E', '#3F83F8'];

// Helper to recursively flatten tree nodes
function flattenTreeNodes(nodes) {
  const result = [];
  const visited = new Set();

  function traverse(list) {
    if (!list || !Array.isArray(list)) return;
    for (const node of list) {
      if (node && !visited.has(node.id)) {
        visited.add(node.id);
        result.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    }
  }

  traverse(nodes);
  return result;
}

export default function NetworkScreen({ navigation }) {
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'list'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [isFocused, setIsFocused] = useState(true);
  const hasLoadedOnce = useRef(false);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    levels: 1,
  });
  const [selectedMember, setSelectedMember] = useState(null);

  // Fetch real-time referral network from API
  const fetchNetwork = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedOnce.current) {
      setLoading(true);
    }

    try {
      const res = await networkService.getReferrals('my');
      if (res && res.success) {
        hasLoadedOnce.current = true;
        const liveTree = Array.isArray(res.tree) ? res.tree : [];
        const liveReferrals = Array.isArray(res.referrals) ? res.referrals : [];

        setTreeData(liveTree);
        setReferrals(liveReferrals);

        const flattened = flattenTreeNodes(liveTree);
        const downlines = flattened.filter((m) => (m.level !== undefined ? m.level > 0 : m.id !== liveTree[0]?.id));
        const downlineTotal = res.summary?.total_referrals ?? (liveReferrals.length > 0 ? liveReferrals.length : downlines.length);
        const downlineActive = res.summary?.active_referrals ?? downlines.filter((m) => m.is_active || m.status === 'Active').length;
        const downlineLevels = res.summary?.levels ?? (downlines.length > 0 ? Math.max(...downlines.map((m) => m.level)) : 1);

        setSummary({
          total: downlineTotal,
          active: downlineActive,
          levels: Math.max(downlineLevels, 1),
        });
      } else {
        if (!hasLoadedOnce.current) {
          setTreeData([]);
          setReferrals([]);
        }
      }
    } catch (err) {
      console.error('Failed to load real-time downline data:', err);
      if (!hasLoadedOnce.current) {
        setTreeData([]);
        setReferrals([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      fetchNetwork(false);
      return () => {
        setIsFocused(false);
      };
    }, [fetchNetwork])
  );

  // Downline members only for the List View
  const allMembers = useMemo(() => {
    if (referrals && referrals.length > 0) {
      return referrals;
    }
    const flat = flattenTreeNodes(treeData);
    // Exclude the root user itself from the downlines list
    return flat.filter((m) => (m.level !== undefined ? m.level > 0 : m.id !== treeData[0]?.id));
  }, [treeData, referrals]);

  // Filtered members for List View
  const filteredList = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return allMembers;
    return allMembers.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(term)) ||
        (m.code && m.code.toLowerCase().includes(term)) ||
        (m.referral_code && m.referral_code.toLowerCase().includes(term)) ||
        (m.phone && m.phone.toLowerCase().includes(term))
    );
  }, [allMembers, search]);

  const handleMemberPress = (member) => {
    const memberPayload = {
      ...member,
      id: member.user_id || member.id,
      name: member.name || 'Member',
      profile_image: member.avatar || member.profile_image,
      role: member.level === 1 ? 'Sponsor / Root Member' : `Level ${member.level || 2} Referral`,
      joined: member.joined || member.joined_formatted || 'Recently',
      color: member.badgeColor || '#C89738',
      phone: member.phone || 'Not provided',
      email: member.email || 'Not provided',
      earnings: member.slot || (member.wallet_balance ? `₹${member.wallet_balance}` : '₹0.00'),
      orders: member.total_orders || 0,
      team: member.children_count || (member.children ? member.children.length : 0),
      status: member.status || (member.is_active ? 'Active' : 'Inactive'),
    };
    setSelectedMember(null);
    navigation.navigate('MemberDetails', { member: memberPayload });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Referral Network" />

      {/* Top Controls Container */}
      <View style={styles.topControlSection}>
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          {[
            { label: 'Total Network', value: String(summary.total), icon: 'people' },
            { label: 'Active Members', value: String(summary.active), icon: 'checkmark-circle' },
            { label: 'Network Levels', value: String(summary.levels), icon: 'layers' },
          ].map((s, i) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <View style={styles.statIconBox}>
                  <Ionicons name={s.icon} size={15} color="#C89738" />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < 2 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* View Switcher Pills */}
        <View style={styles.switchWrapper}>
          <TouchableOpacity
            style={[styles.switchPill, viewMode === 'tree' && styles.switchPillActive]}
            activeOpacity={0.8}
            onPress={() => setViewMode('tree')}
          >
            <Ionicons
              name="git-network-outline"
              size={16}
              color={viewMode === 'tree' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.switchPillText,
                viewMode === 'tree' && styles.switchPillTextActive,
              ]}
            >
              Tree Structure
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchPill, viewMode === 'list' && styles.switchPillActive]}
            activeOpacity={0.8}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={viewMode === 'list' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.switchPillText,
                viewMode === 'list' && styles.switchPillTextActive,
              ]}
            >
              Members List ({filteredList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={17} color="#9E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              viewMode === 'tree'
                ? 'Highlight member or code in tree...'
                : 'Search by name or referral code...'
            }
            placeholderTextColor="#9E8E93"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color="#9E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C89738" />
          <Text style={styles.loadingText}>Loading Referral Network...</Text>
        </View>
      ) : viewMode === 'tree' ? (
        <View style={styles.treeContainer}>
          {treeData.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchNetwork(true)}
                  tintColor="#C89738"
                  colors={['#C89738']}
                />
              }
            >
              <View style={styles.emptyIconBox}>
                <Ionicons name="git-network-outline" size={44} color="#C89738" />
              </View>
              <Text style={styles.emptyTitle}>No Referral Network Found</Text>
              <Text style={styles.emptySubtitle}>
                Invite members using your referral code. When they register, they will appear in your referral tree!
              </Text>
            </ScrollView>
          ) : (
            <NetworkTreeGraph
              data={treeData}
              searchQuery={search}
              isFocused={isFocused}
              onSelectMember={(member) => setSelectedMember(member)}
            />
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNetwork(true)}
              tintColor="#C89738"
              colors={['#C89738']}
            />
          }
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listTitle}>All Referral Members</Text>
            <Text style={styles.listCount}>
              {filteredList.length} {filteredList.length === 1 ? 'member' : 'members'}
            </Text>
          </View>

          {filteredList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={38} color="#9E8E93" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No Members Found</Text>
              <Text style={styles.emptySubtitle}>
                No member matched "{search}". Try searching with another name or code.
              </Text>
            </View>
          ) : (
            filteredList.map((member, i) => {
              const cardColor = member.badgeColor || COLOR_PALETTE[i % COLOR_PALETTE.length];
              const isActive = member.status === 'Active' || member.is_active;

              return (
                <TouchableOpacity
                  key={member.id || i}
                  style={styles.memberCard}
                  activeOpacity={0.7}
                  onPress={() => handleMemberPress(member)}
                >
                  {member.avatar || member.profile_image ? (
                    <Image
                      source={{ uri: member.avatar || member.profile_image }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={[styles.avatarBadge, { backgroundColor: cardColor + '18' }]}>
                      <Text style={[styles.avatarBadgeText, { color: cardColor }]}>
                        {member.initials || 'M'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <View
                        style={[
                          styles.levelPill,
                          { backgroundColor: cardColor + '18' },
                        ]}
                      >
                        <Text style={[styles.levelPillText, { color: cardColor }]}>
                          Level {member.level || 1}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.codeText}>
                        Code: <Text style={styles.codeVal}>{member.code || member.referral_code}</Text>
                      </Text>
                      <Text style={styles.slotText}>
                        Slot: <Text style={styles.slotVal}>{member.slot || (member.wallet_balance ? `₹${member.wallet_balance}` : '₹0.00')}</Text>
                      </Text>
                    </View>

                    <View style={styles.bottomMetaRow}>
                      <View
                        style={[
                          styles.statusBadge,
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
                            styles.statusText,
                            { color: isActive ? '#27A462' : '#9E8E93' },
                          ]}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>

                      {(member.children_count > 0 || (member.children && member.children.length > 0)) && (
                        <Text style={styles.teamText}>
                          {member.children_count || member.children.length} direct downlines
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.arrowBtn}>
                    <Ionicons name="chevron-forward" size={16} color="#9E8E93" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Member Details Bottom Sheet / Modal */}
      <Modal
        visible={!!selectedMember}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalDismissOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMember(null)}
          />

          {selectedMember && (
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalAvatarRow}>
                  {selectedMember.avatar || selectedMember.profile_image ? (
                    <Image
                      source={{ uri: selectedMember.avatar || selectedMember.profile_image }}
                      style={styles.modalAvatarImg}
                    />
                  ) : (
                    <View
                      style={[
                        styles.modalAvatarBadge,
                        { backgroundColor: (selectedMember.badgeColor || '#C89738') + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalAvatarText,
                          { color: selectedMember.badgeColor || '#C89738' },
                        ]}
                      >
                        {selectedMember.initials || 'DS'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalTitleCol}>
                    <Text style={styles.modalName} numberOfLines={1}>
                      {selectedMember.name}
                    </Text>
                    <View style={styles.modalSubRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              selectedMember.status === 'Active' || selectedMember.is_active
                                ? '#E8FBF5'
                                : '#F3F4F6',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor:
                                selectedMember.status === 'Active' || selectedMember.is_active
                                  ? '#27A462'
                                  : '#9E8E93',
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color:
                                selectedMember.status === 'Active' || selectedMember.is_active
                                  ? '#27A462'
                                  : '#9E8E93',
                            },
                          ]}
                        >
                          {selectedMember.status || (selectedMember.is_active ? 'Active' : 'Inactive')}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.levelPill,
                          { backgroundColor: (selectedMember.badgeColor || '#C89738') + '15' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.levelPillText,
                            { color: selectedMember.badgeColor || '#C89738' },
                          ]}
                        >
                          Level {selectedMember.level || 1}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedMember(null)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Details Grid */}
              <View style={styles.modalGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Referral Code</Text>
                  <Text style={styles.gridCodeVal}>{selectedMember.code || selectedMember.referral_code}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Slot Earnings</Text>
                  <Text style={styles.gridSlotVal}>{selectedMember.slot || (selectedMember.wallet_balance ? `₹${selectedMember.wallet_balance}` : '₹0.00')}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Direct Referrals</Text>
                  <Text style={styles.gridVal}>
                    {selectedMember.children_count ?? (selectedMember.children ? selectedMember.children.length : 0)} members
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Joined Date</Text>
                  <Text style={styles.gridVal}>{selectedMember.joined || selectedMember.joined_formatted || 'Recently'}</Text>
                </View>
              </View>

              {/* Contact Information */}
              {(selectedMember.phone || selectedMember.email) ? (
                <View style={styles.modalContactBox}>
                  {selectedMember.phone ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color="#C89738" />
                      <Text style={styles.contactText}>{selectedMember.phone}</Text>
                    </View>
                  ) : null}
                  {selectedMember.email ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={14} color="#C89738" />
                      <Text style={styles.contactText}>{selectedMember.email}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Action Buttons: Full-width View Profile button */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtnFull}
                  activeOpacity={0.8}
                  onPress={() => handleMemberPress(selectedMember)}
                >
                  <Ionicons name="person-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.modalPrimaryBtnText}>View Full Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  topControlSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FAF7F8',
  },
  statsBanner: {
    backgroundColor: '#2A1E24',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(200,151,56,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  switchWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EAE2E5',
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  switchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  switchPillActive: {
    backgroundColor: '#2A1E24',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  switchPillText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#64748B',
  },
  switchPillTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 6,
    height: 42,
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
    height: 42,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#2A1E24',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#9E8E93',
  },
  treeContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#2A1E24',
  },
  listCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9E8E93',
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#F0EAED',
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 13.5,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  levelPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  levelPillText: {
    fontSize: 9.5,
    fontFamily: 'Poppins_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
  },
  codeVal: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#E64A78',
  },
  slotText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
  },
  slotVal: {
    fontFamily: 'Poppins_700Bold',
    color: '#C89738',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  teamText: {
    fontSize: 10.5,
    fontFamily: 'Poppins_400Regular',
    color: '#9E8E93',
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#2A1E24',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: 'Poppins_400Regular',
    color: '#9E8E93',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissOverlay: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FAF7F8',
  },
  modalAvatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  modalTitleCol: {
    marginLeft: 12,
    flex: 1,
  },
  modalName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  modalSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FAF7F8',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 64) / 2,
    gap: 2,
  },
  gridLabel: {
    fontSize: 10.5,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
  },
  gridCodeVal: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#E64A78',
  },
  gridSlotVal: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#C89738',
  },
  gridVal: {
    fontSize: 12.5,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1E293B',
  },
  modalContactBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EAED',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 11.5,
    fontFamily: 'Poppins_400Regular',
    color: '#475569',
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalPrimaryBtnFull: {
    flex: 1,
    backgroundColor: '#2A1E24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalPrimaryBtnText: {
    fontSize: 13.5,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});
