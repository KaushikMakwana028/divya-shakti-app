import React, { useMemo } from 'react';
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
import Alert from '../services/alertService';
import Header from '../components/Header';

// Support channels metadata
const SUPPORT_PHONE = '+91 75730 70341';
const SUPPORT_PHONE_CLEAN = '917573070341';
const SUPPORT_EMAIL = 'divyshakti7228@gmail.com';
const SUPPORT_WEBSITE = 'https://divyshakti.visiontechnolabs.com';
const INSTAGRAM_HANDLE = 'divyshakti_7228';
const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;
const FACEBOOK_URL = 'https://www.facebook.com/share/1D6Rson5t5/';
const OFFICE_ADDRESS =
  'Ground Floor, Shop No. 31, Plot No. 5, Anand Complex,\nNew Sarvodaya Society, 80 Feet Road, Ahir Chowk,\nRajkot, Gujarat – 360002';
const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(
  'Anand Complex, New Sarvodaya Society, 80 Feet Road, Ahir Chowk, Rajkot, Gujarat 360002'
)}`;

export default function ContactUsScreen() {
  // Dynamic business hours calculation (Mon-Sat, 9:00 AM - 7:00 PM IST)
  const isOnline = useMemo(() => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const day = istDate.getUTCDay(); // 0 = Sun, 6 = Sat
    const hour = istDate.getUTCHours();
    return day >= 1 && day <= 6 && hour >= 9 && hour < 19;
  }, []);

  // Handlers for quick contact actions
  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE_CLEAN}`).catch(() => {
      Alert.alert('Unable to Call', `Please dial ${SUPPORT_PHONE} directly.`);
    });
  };

  const handleWhatsApp = (customMessage) => {
    const textToSend =
      customMessage || 'Hello Divy Shakti Support Team! I have an inquiry.';
    const url = `https://wa.me/${SUPPORT_PHONE_CLEAN}?text=${encodeURIComponent(textToSend)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed.');
    });
  };

  const handleEmail = () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Divy Shakti Support Inquiry')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Email Error', `Please write to ${SUPPORT_EMAIL}`);
    });
  };

  const handleOpenMap = () => {
    Linking.openURL(MAPS_URL).catch(() => {
      Alert.alert('Map Error', 'Could not open location maps.');
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Contact Us" showBack={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Sleek Support Banner */}
        <View style={styles.topBannerCard}>
          <View style={styles.topBannerHeader}>
            <View style={styles.topBannerIconWrap}>
              <Ionicons name="headset" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.topBannerTextCol}>
              <Text style={styles.topBannerTitle}>We're Here to Help</Text>
              <Text style={styles.topBannerSubtitle}>
                Connect directly with our care desk anytime
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Communication 2x2 Grid (Guaranteed 50/50 split) */}
        <Text style={styles.sectionHeaderTitle}>Connect With Us Directly</Text>

        {/* Row 1: Phone & WhatsApp */}
        <View style={styles.channelRow}>
          {/* Phone Call */}
          <TouchableOpacity
            style={styles.channelCard}
            activeOpacity={0.7}
            onPress={handleCall}
          >
            <View style={[styles.channelIconWrap, { backgroundColor: '#FFF0F4' }]}>
              <Ionicons name="call" size={19} color="#E64A78" />
            </View>
            <Text style={styles.channelTitle}>Phone Call</Text>
            <Text style={styles.channelDetail} numberOfLines={1}>
              {SUPPORT_PHONE}
            </Text>
            <View style={styles.channelActionRow}>
              <Text style={styles.channelActionText}>Tap to Dial</Text>
              <Ionicons name="chevron-forward" size={13} color="#E64A78" />
            </View>
          </TouchableOpacity>

          {/* WhatsApp */}
          <TouchableOpacity
            style={styles.channelCard}
            activeOpacity={0.7}
            onPress={() => handleWhatsApp()}
          >
            <View style={[styles.channelIconWrap, { backgroundColor: '#EAF8F1' }]}>
              <Ionicons name="logo-whatsapp" size={19} color="#27A462" />
            </View>
            <Text style={styles.channelTitle}>WhatsApp</Text>
            <Text style={styles.channelDetail} numberOfLines={1}>
              Instant Chat
            </Text>
            <View style={styles.channelActionRow}>
              <Text style={[styles.channelActionText, { color: '#27A462' }]}>Chat Now</Text>
              <Ionicons name="chevron-forward" size={13} color="#27A462" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Row 2: Email Desk & Head Office */}
        <View style={styles.channelRow}>
          {/* Email */}
          <TouchableOpacity
            style={styles.channelCard}
            activeOpacity={0.7}
            onPress={handleEmail}
          >
            <View style={[styles.channelIconWrap, { backgroundColor: '#EEF4FD' }]}>
              <Ionicons name="mail" size={19} color="#4A7CE6" />
            </View>
            <Text style={styles.channelTitle}>Email Desk</Text>
            <Text style={styles.channelDetail} numberOfLines={1}>
              Official Desk
            </Text>
            <View style={styles.channelActionRow}>
              <Text style={[styles.channelActionText, { color: '#4A7CE6' }]}>Send Email</Text>
              <Ionicons name="chevron-forward" size={13} color="#4A7CE6" />
            </View>
          </TouchableOpacity>

          {/* Head Office Location */}
          <TouchableOpacity
            style={styles.channelCard}
            activeOpacity={0.7}
            onPress={handleOpenMap}
          >
            <View style={[styles.channelIconWrap, { backgroundColor: '#FAF4E8' }]}>
              <Ionicons name="location" size={19} color="#C89738" />
            </View>
            <Text style={styles.channelTitle}>Head Office</Text>
            <Text style={styles.channelDetail} numberOfLines={1}>
              Rajkot, Gujarat
            </Text>
            <View style={styles.channelActionRow}>
              <Text style={[styles.channelActionText, { color: '#C89738' }]}>Directions</Text>
              <Ionicons name="chevron-forward" size={13} color="#C89738" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Headquarters & Working Hours Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: '#FAF4E8' }]}>
              <Ionicons name="business-outline" size={18} color="#C89738" />
            </View>
            <Text style={styles.infoTitle}>Corporate Office & Hours</Text>
          </View>

          <View style={styles.officeDetailRow}>
            <Ionicons name="location-outline" size={18} color="#E64A78" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.officeLabel}>Registered Office</Text>
              <Text style={styles.officeValue}>{OFFICE_ADDRESS}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.directionsBtn}
            activeOpacity={0.7}
            onPress={handleOpenMap}
          >
            <Ionicons name="map-outline" size={16} color="#C89738" />
            <Text style={styles.directionsBtnText}>View Office on Google Maps</Text>
            <Ionicons name="open-outline" size={15} color="#C89738" />
          </TouchableOpacity>
        </View>

        {/* Social Media Community Connect */}
        <View style={styles.socialCard}>
          <Text style={styles.socialTitle}>Stay Connected</Text>
          <Text style={styles.socialSubtitle}>
            Follow us on social platforms for health tips, wellness advice, and community updates.
          </Text>

          <View style={styles.socialIconsRow}>
            <TouchableOpacity
              style={[styles.socialPill, { borderColor: '#EAF8F1', backgroundColor: '#EAF8F1' }]}
              activeOpacity={0.7}
              onPress={() => handleWhatsApp('Hello Divy Shakti! Please add me to your updates channel.')}
            >
              <Ionicons name="logo-whatsapp" size={17} color="#27A462" />
              <Text style={[styles.socialPillText, { color: '#27A462' }]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialPill, { borderColor: '#FFF0F4', backgroundColor: '#FFF0F4' }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(INSTAGRAM_URL).catch(() => { })}
            >
              <Ionicons name="logo-instagram" size={17} color="#E64A78" />
              <Text style={[styles.socialPillText, { color: '#E64A78' }]}>Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialPill, { borderColor: '#EEF4FD', backgroundColor: '#EEF4FD' }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(FACEBOOK_URL).catch(() => { })}
            >
              <Ionicons name="logo-facebook" size={17} color="#4A7CE6" />
              <Text style={[styles.socialPillText, { color: '#4A7CE6' }]}>Facebook</Text>
            </TouchableOpacity>
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
    paddingTop: 4,
    paddingBottom: 40,
  },

  /* ── Sleek Top Support Banner ── */
  topBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5E6EB',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E64A78',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  topBannerTextCol: {
    flex: 1,
  },
  topBannerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
    marginBottom: 2,
  },
  topBannerSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#8C7A82',
    lineHeight: 16,
  },
  topBannerDivider: {
    height: 1,
    backgroundColor: '#F5E6EB',
    marginVertical: 12,
  },
  topBannerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF7F8',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  responseText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: '#5C4A52',
  },

  /* ── Section Header ── */
  sectionHeaderTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#2A1E24',
    marginBottom: 10,
    marginLeft: 2,
  },

  /* ── Quick Channels 2x2 Grid (50/50 flex rows) ── */
  channelRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  channelCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  channelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  channelTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13.5,
    color: '#2A1E24',
    marginBottom: 2,
  },
  channelDetail: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#8C7A82',
    marginBottom: 8,
  },
  channelActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 'auto',
  },
  channelActionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    color: '#E64A78',
  },

  /* ── Info Card (Office & Hours) ── */
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15.5,
    color: '#2A1E24',
  },
  officeDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  officeLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#2A1E24',
    marginBottom: 2,
  },
  officeValue: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#5C4A52',
    lineHeight: 18,
  },
  officeDivider: {
    height: 1,
    backgroundColor: '#F0EAED',
    marginVertical: 12,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF4E8',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F7E4BD',
  },
  directionsBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#C89738',
  },

  /* ── Social Card ── */
  socialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    alignItems: 'center',
  },
  socialTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#2A1E24',
    marginBottom: 4,
  },
  socialSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#8C7A82',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  socialIconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  socialPillText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },

  /* ── Footer ── */
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 3,
  },
  footerBrand: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#8C7A82',
  },
  footerVersion: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#A899A0',
  },
  footerCopyright: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#C4B8BC',
    marginTop: 4,
  },
});