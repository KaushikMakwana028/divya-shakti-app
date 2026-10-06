import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import cmsService from '../services/cmsService';

export default function CmsScreen({ route, navigation }) {
  const type = route?.params?.type || 'privacy'; // 'privacy' | 'terms'
  const isPrivacy = type === 'privacy';

  const defaultTitle = isPrivacy ? 'Privacy Policy' : 'Terms & Conditions';
  const themeColor = isPrivacy ? '#4A7CE6' : '#C89738';
  const themeIcon = isPrivacy ? 'shield-checkmark-outline' : 'document-text-outline';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async () => {
    setError(null);
    try {
      const res = isPrivacy
        ? await cmsService.getPrivacyPolicy()
        : await cmsService.getTermsConditions();

      if (res.success && res.data) {
        setPageData(res.data);
      } else {
        setError(res.message || 'Failed to load page content');
      }
    } catch (err) {
      console.error('CmsScreen fetch error:', err);
      setError('An error occurred while loading content.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isPrivacy]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContent();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      let s = String(dateStr).trim().replace(' ', 'T');
      if (!s.includes('+') && !s.includes('Z') && !s.includes('-', 10)) {
        s += '+05:30';
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return dateStr;
    }
  };

  const renderFormattedContent = (text) => {
    if (!text) return null;

    // Split text into paragraphs
    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((para, index) => {
      const trimmed = para.trim();
      if (!trimmed) return null;

      // Check if this paragraph is a numbered heading like "1. Introduction" or "1.1 Something"
      const isHeading = /^\d+(\.\d+)*\.\s+[A-Z]/.test(trimmed) || /^[A-Z\s]{4,}$/.test(trimmed);

      // Check if it's bullet list items
      if (trimmed.includes('• ') || trimmed.startsWith('- ')) {
        const lines = trimmed.split('\n');
        return (
          <View key={index} style={styles.bulletBlock}>
            {lines.map((line, lIdx) => {
              const lineTrimmed = line.trim();
              if (!lineTrimmed) return null;
              const cleanLine = lineTrimmed.replace(/^[•\-]\s*/, '');
              return (
                <View key={lIdx} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: themeColor }]} />
                  <Text style={styles.bulletText}>{cleanLine}</Text>
                </View>
              );
            })}
          </View>
        );
      }

      if (isHeading) {
        return (
          <View key={index} style={styles.headingContainer}>
            <View style={[styles.headingBar, { backgroundColor: themeColor }]} />
            <Text style={styles.sectionHeading}>{trimmed}</Text>
          </View>
        );
      }

      return (
        <Text key={index} style={styles.paragraph}>
          {trimmed}
        </Text>
      );
    });
  };

  const title = pageData?.title || defaultTitle;
  const contentText = pageData?.plain_text || pageData?.content || '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#2A1E24" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loaderText}>Loading {title}...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCenter}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to load content</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: themeColor }]}
            onPress={() => {
              setLoading(true);
              fetchContent();
            }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[themeColor]}
              tintColor={themeColor}
            />
          }
        >
          {/* Banner Card */}
          <View style={styles.bannerCard}>
            <View style={[styles.bannerIconWrapper, { backgroundColor: `${themeColor}15` }]}>
              <Ionicons name={themeIcon} size={28} color={themeColor} />
            </View>
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerTitle}>{title}</Text>
              {pageData?.updated_at ? (
                <View style={styles.updatedRow}>
                  <Ionicons name="calendar-outline" size={13} color="#8C7A82" />
                  <Text style={styles.updatedText}>
                    Last updated: {formatDate(pageData.updated_at)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.updatedText}>Official Divy Shakti Document</Text>
              )}
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.contentCard}>
            {contentText ? (
              renderFormattedContent(contentText)
            ) : (
              <Text style={styles.emptyText}>No content available.</Text>
            )}
          </View>

          {/* Footer note */}
          <View style={styles.footerContainer}>
            <Ionicons name="shield-outline" size={16} color="#8C7A82" />
            <Text style={styles.footerText}>
              Divy Shakti — Empowering Devotion & Community
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F8',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAED',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
    textAlign: 'center',
    flex: 1,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8C7A82',
    fontWeight: '500',
  },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A1E24',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#8C7A82',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  bannerIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2A1E24',
    marginBottom: 4,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updatedText: {
    fontSize: 12,
    color: '#8C7A82',
    fontWeight: '500',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0EAED',
    shadowColor: '#2A1E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  headingBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1E24',
    flex: 1,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B3F45',
    marginBottom: 12,
  },
  bulletBlock: {
    marginVertical: 6,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#4B3F45',
  },
  emptyText: {
    fontSize: 14,
    color: '#8C7A82',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#8C7A82',
  },
});
