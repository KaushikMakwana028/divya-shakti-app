import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';

const MEMBERS = [
  { 
    id: 1,
    name: 'Priya Sharma',
    role: 'Silver Member',
    joined: '2 days ago',
    color: '#E64A78',
    phone: '+91 98765 43210',
    email: 'priya.sharma@example.com',
    earnings: '₹12,500',
    orders: 15,
    team: 8,
    status: 'Active',
  },
  {
    id: 2,
    name: 'Amit Patel',
    role: 'Gold Member',
    joined: '1 week ago',
    color: '#C89738',
    phone: '+91 98765 43211',
    email: 'amit.patel@example.com',
    earnings: '₹28,400',
    orders: 32,
    team: 24,
    status: 'Active',
  },
  {
    id: 3,
    name: 'Sunita Verma',
    role: 'Silver Member',
    joined: '2 weeks ago',
    color: '#7B61C4',
    phone: '+91 98765 43212',
    email: 'sunita.verma@example.com',
    earnings: '₹9,800',
    orders: 12,
    team: 5,
    status: 'Active',
  },
  {
    id: 4,
    name: 'Ravi Kumar',
    role: 'Bronze Member',
    joined: '1 month ago',
    color: '#4A7CE6',
    phone: '+91 98765 43213',
    email: 'ravi.kumar@example.com',
    earnings: '₹5,200',
    orders: 8,
    team: 3,
    status: 'Inactive',
  },
  {
    id: 5,
    name: 'Meena Joshi',
    role: 'Gold Member',
    joined: '3 weeks ago',
    color: '#C89738',
    phone: '+91 98765 43214',
    email: 'meena.joshi@example.com',
    earnings: '₹22,100',
    orders: 28,
    team: 18,
    status: 'Active',
  },
];

export default function NetworkScreen({ navigation }) {
  const [search, setSearch] = useState('');

  const filtered = MEMBERS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleMemberPress = (member) => {
    navigation.navigate('MemberDetails', { member });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="My Network" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          {[
            { label: 'Total', value: '248', icon: 'people' },
            { label: 'Active', value: '186', icon: 'checkmark-circle' },
            { label: 'Levels', value: '3', icon: 'layers' },
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
            placeholder="Search members..."
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
          <Text style={styles.sectionTitle}>Direct Members</Text>
          <Text style={styles.countText}>{filtered.length} members</Text>
        </View>

        {/* Members List */}
        {filtered.map((member, i) => (
          <TouchableOpacity
            key={member.id}
            style={styles.memberCard}
            activeOpacity={0.7}
            onPress={() => handleMemberPress(member)}
          >
            <View style={[styles.avatar, { backgroundColor: member.color + '18' }]}>
              <Text style={[styles.avatarText, { color: member.color }]}>
                {member.name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.roleBadge, { backgroundColor: member.color + '15' }]}>
                  <Text style={[styles.roleText, { color: member.color }]}>
                    {member.role}
                  </Text>
                </View>
                <Text style={styles.joinedText}>{member.joined}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.arrowBtn}
              onPress={() => handleMemberPress(member)}
            >
              <Ionicons name="chevron-forward" size={14} color="#9E8E93" />
            </TouchableOpacity>
          </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120, // Increased for floating bottom bar
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
    fontSize: 14,
    color: '#2A1E24',
    paddingVertical: 14,
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
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
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
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 