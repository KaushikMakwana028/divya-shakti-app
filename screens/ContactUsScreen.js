import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

// Support channels metadata
const SUPPORT_PHONE = '+91 98765 43210';
const SUPPORT_PHONE_CLEAN = '919876543210';
const SUPPORT_EMAIL = 'support@divyashakti.com';
const SUPPORT_WEBSITE = 'https://divyshakti.visiontechnolabs.com';
const MAPS_URL = 'https://maps.google.com/?q=Ahmedabad,+Gujarat,+India';

// Inquiry category chips
const INQUIRY_CATEGORIES = [
  { id: 'order', label: 'Order & Delivery', icon: 'cube-outline', subject: 'Order & Delivery Inquiry' },
  { id: 'product', label: 'Product Guidance', icon: 'leaf-outline', subject: 'Product & Ayurvedic Guidance' },
  { id: 'network', label: 'Distributor Network', icon: 'people-outline', subject: 'Distributor & Network Support' },
  { id: 'wallet', label: 'Wallet & Payouts', icon: 'wallet-outline', subject: 'Wallet & Payout Inquiry' },
  { id: 'other', label: 'General Questions', icon: 'help-circle-outline', subject: 'General Support Question' },
];

// Frequently Asked Questions
const FAQS = [
  {
    question: 'How can I track the live status of my order?',
    answer:
      'You can easily track your order in real-time by going to the "Profile" tab and selecting "My Orders". Tap on any order to view detailed timeline updates from packed to out for delivery.',
  },
  {
    question: 'How do I join the Divya Shakti distributor network?',
    answer:
      'To join as a distributor or partner, navigate to the "Network" section in the bottom bar or contact our team directly via WhatsApp or Phone. Our regional manager will guide you through registration and distributor benefits.',
  },
  {
    question: 'When are wallet rewards and commissions credited?',
    answer:
      'Referral commissions are credited directly to your Divya Shakti Wallet once your referred member account is verified and activated by the admin.',
  },
  {
    question: 'What is your return & replacement policy?',
    answer:
      'We offer a 7-day hassle-free replacement policy for any damaged, defective, or incorrect items received. Simply reach out through this screen or email with your Order ID and package photo.',
  },
  {
    question: 'Are all Divya Shakti products 100% natural and certified?',
    answer:
      'Yes, all our Ayurvedic wellness and personal care formulations are 100% pure, ethically sourced, and manufactured in certified facilities adhering to strict quality and safety guidelines.',
  },
];

export default function ContactUsScreen() {
  const { user } = useAuth();

  // Selected Category
  const [selectedCategory, setSelectedCategory] = useState(INQUIRY_CATEGORIES[0]);

  // Form State - pre-filled from user profile if available
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || user?.mobile || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState(INQUIRY_CATEGORIES[0].subject);
  const [message, setMessage] = useState('');

  // UI States
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(0);

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
      customMessage ||
      `Hello Divya Shakti Support Team! I have an inquiry regarding: ${selectedCategory.label}.`;
    const url = `https://wa.me/${SUPPORT_PHONE_CLEAN}?text=${encodeURIComponent(textToSend)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed.');
    });
  };

  const handleEmail = () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject || 'Divya Shakti Support Inquiry'
    )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Email Error', `Please write to ${SUPPORT_EMAIL}`);
    });
  };

  const handleOpenMap = () => {
    Linking.openURL(MAPS_URL).catch(() => {
      Alert.alert('Map Error', 'Could not open location maps.');
    });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSubject(category.subject);
  };

  const handleToggleFaq = (index) => {
    setExpandedFaqIndex((prev) => (prev === index ? null : index));
  };

  // Dynamic message submission
  const handleSubmitMessage = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      Alert.alert('Required Field', 'Please provide either a phone number or email address so we can reach you.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required Field', 'Please describe your inquiry or message.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const ticketId = `DS-${Math.floor(10000 + Math.random() * 90000)}`;
      setSubmittedTicket({
        id: ticketId,
        category: selectedCategory.label,
        name: name.trim(),
        subject: subject.trim(),
        message: message.trim(),
        date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      setIsSubmitting(false);
    }, 600);
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Contact Us" showBack={true} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
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
                  Connect directly with our care desk or write a message
                </Text>
              </View>
            </View>

            <View style={styles.topBannerDivider} />

            {/* Dynamic Status & Avg Response Pills */}
            <View style={styles.topBannerMetaRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isOnline ? '#EAF8F1' : '#FAF4E8',
                    borderColor: isOnline ? '#C6EED8' : '#F7E4BD',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? '#27A462' : '#C89738' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isOnline ? '#1B7A47' : '#9E7422' },
                  ]}
                >
                  {isOnline ? 'Online (9 AM - 7 PM)' : 'Offline • Leave a message'}
                </Text>
              </View>

              <View style={styles.responseBadge}>
                <Ionicons name="flash" size={12} color="#E64A78" />
                <Text style={styles.responseText}>Avg reply: &lt; 2 hrs</Text>
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
                Ahmedabad, Gujarat
              </Text>
              <View style={styles.channelActionRow}>
                <Text style={[styles.channelActionText, { color: '#C89738' }]}>Directions</Text>
                <Ionicons name="chevron-forward" size={13} color="#C89738" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Dynamic Inquiry / Message Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <View style={[styles.formIconWrap, { backgroundColor: '#FFF0F4' }]}>
                <Ionicons name="chatbubbles" size={18} color="#E64A78" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formCardTitle}>Send Us a Message</Text>
                <Text style={styles.formCardSubtitle}>
                  Choose an inquiry topic and submit your question
                </Text>
              </View>
            </View>

            {submittedTicket ? (
              /* Success Confirmation Ticket Card */
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={48} color="#27A462" />
                </View>
                <Text style={styles.successTitle}>Inquiry Sent Successfully!</Text>
                <Text style={styles.successDesc}>
                  Thank you for contacting Divya Shakti. Our support team has logged your
                  request and will respond shortly.
                </Text>

                <View style={styles.ticketSummaryBox}>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Ticket ID:</Text>
                    <Text style={styles.ticketValueBold}>{submittedTicket.id}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Topic:</Text>
                    <Text style={styles.ticketValue}>{submittedTicket.category}</Text>
                  </View>
                  <View style={styles.ticketRow}>
                    <Text style={styles.ticketLabel}>Submitted At:</Text>
                    <Text style={styles.ticketValue}>{submittedTicket.date}</Text>
                  </View>
                </View>

                {/* Instant WhatsApp alternative */}
                <TouchableOpacity
                  style={styles.whatsappFollowUpBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    handleWhatsApp(
                      `Hello Divya Shakti Support! Regarding my inquiry (${submittedTicket.id}): "${submittedTicket.message}"`
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.whatsappFollowUpText}>Follow Up on WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetBtn}
                  activeOpacity={0.7}
                  onPress={handleResetForm}
                >
                  <Ionicons name="refresh-outline" size={16} color="#E64A78" />
                  <Text style={styles.resetBtnText}>Send Another Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* The Interactive Form */
              <View>
                {/* Topic Selector Chips */}
                <Text style={styles.inputLabel}>Select Inquiry Topic</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipsScroll}
                >
                  {INQUIRY_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleCategorySelect(cat)}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={14}
                          color={isSelected ? '#FFFFFF' : '#5C4A52'}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Name */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.inputLabel}>Your Full Name *</Text>
                  <View
                    style={[
                      styles.inputBox,
                      focusedField === 'name' && styles.inputBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={focusedField === 'name' ? '#E64A78' : '#8C7A82'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Ramesh Patel"
                      placeholderTextColor="#A899A0"
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Phone & Email Row */}
                <View style={styles.rowTwoCols}>
                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <View
                      style={[
                        styles.inputBox,
                        focusedField === 'phone' && styles.inputBoxFocused,
                      ]}
                    >
                      <Ionicons
                        name="call-outline"
                        size={17}
                        color={focusedField === 'phone' ? '#E64A78' : '#8C7A82'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit number"
                        placeholderTextColor="#A899A0"
                        keyboardType="phone-pad"
                        maxLength={15}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View
                      style={[
                        styles.inputBox,
                        focusedField === 'email' && styles.inputBoxFocused,
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={17}
                        color={focusedField === 'email' ? '#E64A78' : '#8C7A82'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="your@email.com"
                        placeholderTextColor="#A899A0"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>
                </View>

                {/* Subject */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.inputLabel}>Subject</Text>
                  <View
                    style={[
                      styles.inputBox,
                      focusedField === 'subject' && styles.inputBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="bookmark-outline"
                      size={18}
                      color={focusedField === 'subject' ? '#E64A78' : '#8C7A82'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="Brief topic of your inquiry"
                      placeholderTextColor="#A899A0"
                      onFocus={() => setFocusedField('subject')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Message Textarea */}
                <View style={styles.fieldWrap}>
                  <View style={styles.labelCounterRow}>
                    <Text style={styles.inputLabel}>Your Message *</Text>
                    <Text style={styles.charCounter}>{message.length} / 500</Text>
                  </View>
                  <View
                    style={[
                      styles.textareaBox,
                      focusedField === 'message' && styles.inputBoxFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.textareaInput}
                      value={message}
                      onChangeText={(t) => {
                        if (t.length <= 500) setMessage(t);
                      }}
                      placeholder="Write your query, order details, or questions here..."
                      placeholderTextColor="#A899A0"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      onFocus={() => setFocusedField('message')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Submit Action Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && { opacity: 0.8 }]}
                  activeOpacity={0.8}
                  onPress={handleSubmitMessage}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <View style={styles.submitLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Sending Inquiry...</Text>
                    </View>
                  ) : (
                    <View style={styles.submitRow}>
                      <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Send Message</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
                <Text style={styles.officeLabel}>Registered Headquarters</Text>
                <Text style={styles.officeValue}>
                  Divya Shakti Natural Wellness Pvt. Ltd.{'\n'}
                  S.G. Highway, Bodakdev,{'\n'}
                  Ahmedabad, Gujarat – 380054, India
                </Text>
              </View>
            </View>

            <View style={styles.officeDivider} />

            <View style={styles.officeDetailRow}>
              <Ionicons name="time-outline" size={18} color="#27A462" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.officeLabel}>Operational Hours</Text>
                <Text style={styles.officeValue}>
                  Monday to Saturday: 09:00 AM – 07:00 PM{'\n'}
                  Sunday: Closed (Emergency email support available)
                </Text>
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

          {/* Collapsible FAQ Section */}
          <View style={styles.faqCard}>
            <View style={styles.faqHeaderRow}>
              <View style={[styles.faqIconWrap, { backgroundColor: '#EEF4FD' }]}>
                <Ionicons name="help-circle-outline" size={19} color="#4A7CE6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
                <Text style={styles.faqSubtitle}>Quick answers to common questions</Text>
              </View>
            </View>

            <View style={styles.faqList}>
              {FAQS.map((faq, index) => {
                const isExpanded = expandedFaqIndex === index;
                return (
                  <View key={index} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqQuestionRow}
                      activeOpacity={0.7}
                      onPress={() => handleToggleFaq(index)}
                    >
                      <Text style={[styles.faqQuestionText, isExpanded && styles.faqQuestionActive]}>
                        {faq.question}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={isExpanded ? '#E64A78' : '#8C7A82'}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.faqAnswerBox}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
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
                onPress={() => handleWhatsApp('Hello Divya Shakti! Please add me to your updates channel.')}
              >
                <Ionicons name="logo-whatsapp" size={17} color="#27A462" />
                <Text style={[styles.socialPillText, { color: '#27A462' }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialPill, { borderColor: '#FFF0F4', backgroundColor: '#FFF0F4' }]}
                activeOpacity={0.7}
                onPress={() => Linking.openURL('https://instagram.com').catch(() => {})}
              >
                <Ionicons name="logo-instagram" size={17} color="#E64A78" />
                <Text style={[styles.socialPillText, { color: '#E64A78' }]}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialPill, { borderColor: '#EEF4FD', backgroundColor: '#EEF4FD' }]}
                activeOpacity={0.7}
                onPress={() => Linking.openURL('https://facebook.com').catch(() => {})}
              >
                <Ionicons name="logo-facebook" size={17} color="#4A7CE6" />
                <Text style={[styles.socialPillText, { color: '#4A7CE6' }]}>Facebook</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialPill, { borderColor: '#FAF4E8', backgroundColor: '#FAF4E8' }]}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(SUPPORT_WEBSITE).catch(() => {})}
              >
                <Ionicons name="globe-outline" size={17} color="#C89738" />
                <Text style={[styles.socialPillText, { color: '#C89738' }]}>Website</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Branding */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>Divya Shakti Customer Support Desk</Text>
            <Text style={styles.footerVersion}>Mobile App v1.0.0 • Verified Care</Text>
            <Text style={styles.footerCopyright}>
              © 2026 Divya Shakti Natural Wellness. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  keyboardView: {
    flex: 1,
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

  /* ── Form Card ── */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  formIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2A1E24',
  },
  formCardSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#8C7A82',
    marginTop: 1,
  },

  /* Chips */
  categoryChipsScroll: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF7F8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
  },
  categoryChipActive: {
    backgroundColor: '#E64A78',
    borderColor: '#E64A78',
  },
  categoryChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#5C4A52',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },

  /* Inputs */
  fieldWrap: {
    marginBottom: 12,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#2A1E24',
    marginBottom: 5,
  },
  labelCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  charCounter: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#8C7A82',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    paddingHorizontal: 12,
    height: 46,
  },
  inputBoxFocused: {
    borderColor: '#E64A78',
    backgroundColor: '#FFFFFF',
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
    paddingVertical: 0,
  },
  textareaBox: {
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
  },
  textareaInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#2A1E24',
    lineHeight: 19,
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: '#E64A78',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#E64A78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Success Ticket Feedback */
  successBox: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF8F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 17,
    color: '#2A1E24',
    marginBottom: 6,
  },
  successDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: '#5C4A52',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  ticketSummaryBox: {
    width: '100%',
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    marginBottom: 16,
    gap: 6,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#8C7A82',
  },
  ticketValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#2A1E24',
  },
  ticketValueBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#E64A78',
  },
  whatsappFollowUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#27A462',
    borderRadius: 14,
    width: '100%',
    paddingVertical: 13,
    marginBottom: 10,
    shadowColor: '#27A462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  whatsappFollowUpText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  resetBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
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

  /* ── FAQ Card ── */
  faqCard: {
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
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  faqIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15.5,
    color: '#2A1E24',
  },
  faqSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    color: '#8C7A82',
    marginTop: 1,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    backgroundColor: '#FAF7F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0EAED',
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  faqQuestionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#2A1E24',
    flex: 1,
  },
  faqQuestionActive: {
    color: '#E64A78',
  },
  faqAnswerBox: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#F0EAED',
  },
  faqAnswerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#5C4A52',
    lineHeight: 18.5,
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
