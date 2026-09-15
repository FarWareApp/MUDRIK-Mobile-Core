import React, {
  useEffect,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  CompanionRepository,
} from '../../contracts/CompanionRepository';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { CompanionAvatar } from './components/CompanionAvatar';
import { CompanionCaptionCard } from './components/CompanionCaptionCard';
import { CompanionPreferenceSummary } from './components/CompanionPreferenceSummary';
import { CompanionProfileEditorModal } from './components/CompanionProfileEditorModal';
import { CompanionScreenHeader } from './components/CompanionScreenHeader';
import { CompanionScreenState } from './components/CompanionScreenState';
import { CompanionSessionControls } from './components/CompanionSessionControls';
import { getCompanionProfileErrorTranslationKey } from './getCompanionProfileErrorTranslationKey';
import { useCompanionProfileController } from './hooks/useCompanionProfileController';
import { useCompanionSessionController } from './hooks/useCompanionSessionController';

type Props = {
  repository: CompanionRepository;
};

export function CompanionScreen({
  repository,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);

  const profile = useCompanionProfileController(repository);
  const session = useCompanionSessionController();

  const companionEnabled = profile.profile.enabled;
  const sessionPhase = session.phase;
  const stopSession = session.stop;

  useEffect(() => {
    if (
      !companionEnabled
      && sessionPhase !== 'idle'
    ) {
      stopSession();
    }
  }, [
    companionEnabled,
    sessionPhase,
    stopSession,
  ]);

  if (profile.loading || profile.failed) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background },
        ]}
      >
        <CompanionScreenState
          mode={profile.failed ? 'error' : 'loading'}
          onRetry={
            profile.failed
              ? () => {
                  void profile.reload();
                }
              : undefined
          }
        />
      </SafeAreaView>
    );
  }

  const profileErrorMessage =
    profile.error
      ? t(
          getCompanionProfileErrorTranslationKey(
            profile.error,
          ),
        )
      : null;

  const sessionErrorMessage =
    session.error
      ? t('companionSessionFailed')
      : null;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <CompanionScreenHeader
        disabled={profile.saving}
        onEdit={() => {
          profile.dismissError();
          setEditing(true);
        }}
      />

      {!editing && (profileErrorMessage || sessionErrorMessage) ? (
        <InlineErrorBanner
          message={
            profileErrorMessage
              ?? sessionErrorMessage
              ?? ''
          }
          onDismiss={
            profileErrorMessage
              ? profile.dismissError
              : session.dismissError
          }
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <CompanionAvatar
          name={profile.profile.displayName}
          presentation={profile.profile.presentation}
          phase={sessionPhase}
        />

        {profile.profile.showCaptions ? (
          <CompanionCaptionCard
            enabled={companionEnabled}
          />
        ) : null}

        <View style={styles.controls}>
          <CompanionSessionControls
            phase={sessionPhase}
            enabled={companionEnabled}
            onStart={session.start}
            onStop={stopSession}
            onPause={session.pause}
            onResume={session.resume}
            onInterrupt={session.interrupt}
            onRecover={session.recover}
          />
        </View>

        <CompanionPreferenceSummary
          interactionStyle={profile.profile.interactionStyle}
          presenceLevel={profile.profile.presenceLevel}
          voicePreference={profile.profile.voicePreference}
        />
      </ScrollView>

      <CompanionProfileEditorModal
        visible={editing}
        profile={profile.profile}
        saving={profile.saving}
        errorMessage={profileErrorMessage}
        onCancel={() => {
          if (profile.saving) {
            return;
          }

          profile.dismissError();
          setEditing(false);
        }}
        onSave={(next) => {
          void (async () => {
            const saved = await profile.save(next);

            if (saved) {
              setEditing(false);
            }
          })();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  controls: {
    marginTop: spacing.xxl,
  },
});
