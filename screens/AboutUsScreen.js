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

export default function AboutUsScreen({ navigation }) {
  const handleEmailPress = () => {
    Linking.openURL('mailto:support@divyashakti.com').catch(() => {});
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://divyshakti.visiontechnolabs.com').catch(() => {});
  };

  const CORE_VALUES = [
    {
      icon: 'leaf-outline',
      color: '#27A462',
      bg: '#EAF8F1',
      title: '100% Pure & Herbal',
      desc: 'Authentic Ayurvedic formulations created with carefully sourced natural herbs and botanicals, completely free from harsh toxins.',
    },
    {
      icon: 'shield-checkmark-outline',
      color: '#4A7CE6',
      bg: '#EEF4FD',
      title: 'Certified Quality',
      desc: 'Manufactured in certified facilities adhering to rigorous quality standards and lab testing for maximum potency and safety.',
    },
    {
      icon: 'people-outline',
      color: '#7B61C4',
      bg: '#F5F1FD',
      title: 'Community Empowerment',
      desc: 'Fostering financial independence and entrepreneurial growth for members through transparent rewards and direct payouts.',
    },
    {
      icon: 'flash-outline',
      color: '#C89738',
      bg: '#FAF4E8',
      title: 'Reliable & Swift',
      desc: 'Seamless doorstep delivery across India, backed by responsive customer support and dedicated partner guidance.',
    },
  ];

  const IMPACT_STATS = [
    { number: '10K+', label: 'Happy Customers', icon: 'heart', color: '#E64A78' },
    { number: '100%', label: 'Natural & Pure', icon: 'leaf', color: '#27A462' },
    { number: '50+', label: 'Herbal Products', icon: 'cube', color: '#C89738' },
    { number: '28+', label: 'States Served', icon: 'map', color: '#4A7CE6' },
  ];

  const COMMITMENTS = [
    'Ethically sourced, sustainably harvested herbal ingredients',
    'No harmful chemicals, parabens, or synthetic adulterants',
    'Fair and transparent direct-to-community network incentives',
    'Prompt, verified dispatch and comprehensive order tracking',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="About Us" showBack={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Brand Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroDecorCircle} pointerEvents="none" />
          <View style={styles.logoBadgeWrap}>
            <View style={styles.logoBadge}>
              <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.heroBrandName}>Divy Shakti</Text>
          <View style={styles.heroTaglinePill}>
            <Text style={styles.heroTaglineText}>DIVINE WELLNESS & PROSPERITY</Text>
          </View>
          <Text style={styles.heroDesc}>
            Empowering families and individuals through pure Ayurvedic lifestyle solutions,
            holistic well-being, and rewarding community-driven entrepreneurship.
          </Text>

          {/* Quick Badges */}
          <View style={styles.quickBadgesRow}>
            <View style={styles.quickBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#27A462" />
              <Text style={styles.quickBadgeText}>Lab Tested</Text>
            </View>
            <View style={styles.quickBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#C89738" />
              <Text style={styles.quickBadgeText}>Ayurvedic Heritage</Text>
            </View>
            <View style={styles.quickBadge}>
              <Ionicons name="heart" size={13} color="#E64A78" />
              <Text style={styles.quickBadgeText}>Made in India</Text>
            </View>
          </View>
        </View>

        {/* Who We Are */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#FFF0F4' }]}>
              <Ionicons name="business-outline" size={18} color="#E64A78" />
            </View>
            <Text style={styles.sectionTitle}>Who We Are</Text>
          </View>
          <Text style={styles.bodyParagraph}>
            Divy Shakti was born with a profound vision: to bring ancient Indian wellness
            traditions into modern homes while creating sustainable economic opportunities for
            everyone.
          </Text>
          <Text style={[styles.bodyParagraph, { marginTop: 10 }]}>
            We combine time-tested Ayurvedic formulations with modern quality standards, delivering
            exceptional wellness, personal care, and lifestyle products that promote vitality, balance,
            and confidence.
          </Text>
        </View>

        {/* Mission & Vision Dual Cards */}
        <View style={styles.missionVisionRow}>
          <View style={[styles.mvCard, { borderColor: '#FDE4ED' }]}>
            <View style={[styles.mvIconWrap, { backgroundColor: '#FFF0F4' }]}>
              <Ionicons name="compass-outline" size={20} color="#E64A78" />
            </View>
            <Text style={styles.mvTitle}>Our Mission</Text>
            <Text style={styles.mvDesc}>
              To enrich lives through natural, effective wellness products while providing an inclusive
              platform for members to achieve financial independence and personal growth.
            </Text>
          </View>

          <View style={[styles.mvCard, { borderColor: '#FDF1DA' }]}>
            <View style={[styles.mvIconWrap, { backgroundColor: '#FAF4E8' }]}>
              <Ionicons name="eye-outline" size={20} color="#C89738" />
            </View>
            <Text style={styles.mvTitle}>Our Vision</Text>
            <Text style={styles.mvDesc}>
              To be India’s most trusted and empowering wellness community, inspiring healthy living
              and self-reliance in every corner of the nation.
            </Text>
          </View>
        </View>

        {/* Impact Highlights Stats */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#F5F1FD' }]}>
              <Ionicons name="trending-up" size={18} color="#7B61C4" />
            </View>
            <Text style={styles.sectionTitle}>Impact Highlights</Text>
          </View>
          <View style={styles.statsGrid}>
            {IMPACT_STATS.map((stat, idx) => (
              <View key={idx} style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon} size={15} color={stat.color} />
                </View>
                <Text style={styles.statNumber}>{stat.number}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Core Pillars / Values */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EAF8F1' }]}>
              <Ionicons name="ribbon-outline" size={18} color="#27A462" />
            </View>
            <Text style={styles.sectionTitle}>What Sets Us Apart</Text>
          </View>
          <View style={styles.valuesList}>
            {CORE_VALUES.map((val, idx) => (
              <View key={idx} style={styles.valueItem}>
                <View style={[styles.valueIconWrap, { backgroundColor: val.bg }]}>
                  <Ionicons name={val.icon} size={20} color={val.color} />
                </View>
                <View style={styles.valueTextCol}>
                  <Text style={styles.valueTitle}>{val.title}</Text>
                  <Text style={styles.valueDesc}>{val.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Our Promise & Commitments */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EEF4FD' }]}>
              <Ionicons name="heart-circle-outline" size={20} color="#4A7CE6" />
            </View>
            <Text style={styles.sectionTitle}>Our Promise to You</Text>
          </View>
          <View style={styles.commitmentsList}>
            {COMMITMENTS.map((item, idx) => (
              <View key={idx} style={styles.commitmentRow}>
                <Ionicons name="checkmark-circle" size={17} color="#27A462" style={{ marginTop: 2 }} />
                <Text style={styles.commitmentText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Company & Support Contact Card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactCardTitle}>Get In Touch</Text>
          <Text style={styles.contactCardSubtitle}>
            Have questions about our products or community programs? We are always here to help.
          </Text>

          <View style={styles.contactItemsWrap}>
            <TouchableOpacity style={styles.contactRow} onPress={handleEmailPress} activeOpacity={0.7}>
              <View style={[styles.contactIconCircle, { backgroundColor: '#FFF0F4' }]}>
                <Ionicons name="mail-outline" size={17} color="#E64A78" />
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>support@divyashakti.com</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#9E8E93" />
            </TouchableOpacity>

            <View style={styles.contactDivider} />

            <TouchableOpacity style={styles.contactRow} onPress={handleWebsitePress} activeOpacity={0.7}>
              <View style={[styles.contactIconCircle, { backgroundColor: '#EEF4FD' }]}>
                <Ionicons name="globe-outline" size={17} color="#4A7CE6" />
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactLabel}>Official Website</Text>
                <Text style={styles.contactValue}>divyshakti.visiontechnolabs.com</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#9E8E93" />
            </TouchableOpacity>

            <View style={styles.contactDivider} />

            <View style={styles.contactRow}>
              <View style={[styles.contactIconCircle, { backgroundColor: '#FAF4E8' }]}>
                <Ionicons name="location-outline" size={17} color="#C89738" />
              </View>
              <View style={styles.contactInfoCol}>
                <Text style={styles.contactLabel}>Headquarters</Text>
                <Text style={styles.contactValue}>Ahmedabad, Gujarat, India</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.openContactScreenBtn}
            onPress={() => navigation.navigate('ContactUs')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
            <Text style={styles.openContactScreenBtnText}>Open Full Contact Desk</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerAppVersion}>Divy Shakti Mobile App v1.0.0</Text>
          <Text style={styles.footerNote}>Nurturing Health • Inspiring Prosperity</Text>
          <Text style={styles.footerCopyright}>© 2026 Divy Shakti. All rights reserved.</Text>
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
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* ── Hero Card ── */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F5E6EB',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  heroDecorCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF0F4',
    opacity: 0.8,
  },
  logoBadgeWrap: {
    marginBottom: 12,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E64A78',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroBrandName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: '#2A1E24',
    marginBottom: 4,
  },
  heroTaglinePill: {
    backgroundColor: '#FFF0F4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroTaglineText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
    color: '#E64A78',
    letterSpacing: 0.8,
  },
  heroDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#5C4A52',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  quickBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF7F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  quickBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11.5,
    color: '#2A1E24',
  },

  /* ── Section Cards ── */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
  },
  bodyParagraph: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#5C4A52',
    lineHeight: 21,
  },

  /* ── Mission & Vision Row ── */
  missionVisionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  mvCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  mvIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mvTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#2A1E24',
    marginBottom: 6,
  },
  mvDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#5C4A52',
    lineHeight: 18,
  },

  /* ── Impact Highlights Stats Grid ── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FAF7F8',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    color: '#2A1E24',
  },
  statLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11.5,
    color: '#8C7A82',
    marginTop: 2,
  },

  /* ── Core Values List ── */
  valuesList: {
    gap: 14,
  },
  valueItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  valueIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  valueTextCol: {
    flex: 1,
  },
  valueTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#2A1E24',
    marginBottom: 2,
  },
  valueDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#5C4A52',
    lineHeight: 18,
  },

  /* ── Commitments List ── */
  commitmentsList: {
    gap: 10,
  },
  commitmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  commitmentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#5C4A52',
    lineHeight: 19,
    flex: 1,
  },

  /* ── Contact Card ── */
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  contactCardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 4,
  },
  contactCardSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#8C7A82',
    lineHeight: 18,
    marginBottom: 14,
  },
  contactItemsWrap: {
    backgroundColor: '#FAF7F8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfoCol: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#8C7A82',
  },
  contactValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#2A1E24',
    marginTop: 1,
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#F0EAED',
  },
  openContactScreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E64A78',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  openContactScreenBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* ── Footer ── */
  footer: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 3,
  },
  footerAppVersion: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#8C7A82',
  },
  footerNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#A899A0',
  },
  footerCopyright: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    color: '#C4B8BC',
    marginTop: 4,
  },
});
