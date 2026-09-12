import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  DiagnosticRepository,
} from '../../contracts/DiagnosticRepository';
import {
  DiagnosticEvent,
} from '../../contracts/Diagnostics';
import {
  diagnosticsService,
} from '../../core/diagnostics/DiagnosticsService';
import {
  useCoreHealth,
} from '../../core/health/CoreHealthProvider';
import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

type MaintenanceResult = {
  orphanAttachmentsRemoved: number;
};

type Props = {
  repository: DiagnosticRepository;
  runAttachmentMaintenance:
    () => Promise<MaintenanceResult>;
};

const DIAGNOSTIC_LIMIT = 100;

export function DiagnosticsScreen({
  repository,
  runAttachmentMaintenance,
}: Props) {
  const { colors } = useTheme();
  const health = useCoreHealth();

  const [events, setEvents] =
    useState<DiagnosticEvent[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const stored =
        await repository.list(
          DIAGNOSTIC_LIMIT,
        );

      const merged =
        new Map<string, DiagnosticEvent>();

      for (
        const event
        of [
          ...stored,
          ...diagnosticsService.snapshot(),
        ]
      ) {
        merged.set(event.id, event);
      }

      setEvents(
        [...merged.values()]
          .sort(
            (a, b) =>
              b.timestamp - a.timestamp,
          )
          .slice(
            0,
            DIAGNOSTIC_LIMIT,
          ),
      );

      setError(null);
    } catch {
      setError(
        'Unable to load local diagnostics.',
      );
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearDiagnostics =
    useCallback(async () => {
      setBusy(true);

      try {
        diagnosticsService.clear();
        await repository.clear();
        setEvents([]);
        setError(null);
      } catch {
        setError(
          'Unable to clear local diagnostics.',
        );
      } finally {
        setBusy(false);
      }
    }, [repository]);

  const runMaintenance =
    useCallback(async () => {
      setBusy(true);
      setMaintenanceMessage(null);

      try {
        const result =
          await runAttachmentMaintenance();

        setMaintenanceMessage(
          result.orphanAttachmentsRemoved === 0
            ? 'Storage is already clean.'
            : `Removed ${result.orphanAttachmentsRemoved} orphaned attachment${
                result.orphanAttachmentsRemoved === 1
                  ? ''
                  : 's'
              }.`,
        );

        setError(null);
      } catch {
        setError(
          'Unable to complete storage maintenance.',
        );
      } finally {
        setBusy(false);
      }
    }, [runAttachmentMaintenance]);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={[
            styles.back,
            {
              backgroundColor:
                colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 24,
            }}
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Core health & diagnostics
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          CORE HEALTH
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: colors.textPrimary,
                },
              ]}
            >
              {health.status === 'healthy'
                ? 'Healthy'
                : 'Degraded'}
            </Text>

            <Text
              style={{
                color:
                  health.status === 'healthy'
                    ? colors.success
                    : colors.warning,
                fontWeight: '700',
              }}
            >
              {health.ready
                ? 'Ready'
                : 'Starting'}
            </Text>
          </View>

          {health.issues.length === 0 ? (
            <Text
              style={[
                styles.body,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              No core issues are currently reported.
            </Text>
          ) : (
            health.issues.map((issue) => (
              <View
                key={issue.id}
                style={styles.issue}
              >
                <Text
                  style={{
                    color: colors.warning,
                    fontWeight: '700',
                  }}
                >
                  {issue.id}
                </Text>
                <Text
                  style={[
                    styles.body,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}
                >
                  {issue.message}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          LOCAL STORAGE MAINTENANCE
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.body,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Removes only unattached orphan files and records. Conversations, projects, messages and linked attachments are not deleted.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Run safe storage cleanup"
            disabled={busy}
            onPress={() => {
              void runMaintenance();
            }}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  colors.accent,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: colors.accentText,
                fontWeight: '700',
              }}
            >
              Run safe cleanup
            </Text>
          </Pressable>

          {maintenanceMessage && (
            <Text
              accessibilityRole="alert"
              style={[
                styles.feedback,
                {
                  color: colors.success,
                },
              ]}
            >
              {maintenanceMessage}
            </Text>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              styles.sectionTitleInline,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            LOCAL DIAGNOSTICS
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh diagnostics"
            disabled={busy || loading}
            onPress={() => {
              void load();
            }}
            style={styles.inlineAction}
          >
            <Text
              style={{
                color: colors.accent,
                fontWeight: '700',
              }}
            >
              Refresh
            </Text>
          </Pressable>
        </View>

        {error && (
          <View
            accessibilityRole="alert"
            style={[
              styles.errorCard,
              {
                borderColor: colors.error,
              },
            ]}
          >
            <Text
              style={{
                color: colors.error,
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            color={colors.accent}
            style={styles.loader}
          />
        ) : events.length === 0 ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.body,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              No local diagnostic events.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View
              key={event.id}
              style={[
                styles.eventCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.eventModule,
                    {
                      color:
                        colors.textPrimary,
                    },
                  ]}
                >
                  {event.module}
                </Text>

                <Text
                  style={{
                    color:
                      event.level === 'error'
                        ? colors.error
                        : event.level === 'warning'
                          ? colors.warning
                          : colors.textSecondary,
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {event.level.toUpperCase()}
                </Text>
              </View>

              <Text
                selectable
                style={[
                  styles.eventText,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {event.event}
              </Text>

              <Text
                style={[
                  styles.timestamp,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                {formatTimestamp(
                  event.timestamp,
                )}
              </Text>
            </View>
          ))
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear local diagnostics"
          disabled={busy || events.length === 0}
          onPress={() => {
            Alert.alert(
              'Clear local diagnostics?',
              'This deletes troubleshooting logs only. Your conversations, projects, files and settings are not affected.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => {
                    void clearDiagnostics();
                  },
                },
              ],
            );
          }}
          style={[
            styles.secondaryButton,
            {
              borderColor: colors.border,
              opacity:
                busy || events.length === 0
                  ? 0.5
                  : 1,
            },
          ]}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '700',
            }}
          >
            Clear diagnostics
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimestamp(
  timestamp: number,
): string {
  try {
    return new Date(
      timestamp,
    ).toLocaleString();
  } catch {
    return String(timestamp);
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },

  sectionHeader: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
  },

  sectionTitleInline: {
    marginTop: 0,
    marginBottom: 8,
  },

  inlineAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },

  eventCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  body: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },

  issue: {
    marginTop: 10,
    gap: 2,
  },

  eventModule: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },

  eventText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },

  timestamp: {
    marginTop: 6,
    fontSize: 10,
  },

  primaryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 22,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 14,
  },

  secondaryButton: {
    alignSelf: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 18,
  },

  feedback: {
    marginTop: 10,
    fontSize: 12,
  },

  loader: {
    marginVertical: 24,
  },
});
