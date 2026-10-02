import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import type {
  CompanionSessionPhase,
} from '../../../contracts/Companion';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  FlagshipActionButton,
} from '../../../design-system/components/FlagshipActionButton';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

type Props = {
  phase: CompanionSessionPhase;
  enabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onInterrupt: () => void;
  onRecover: () => void;
};

export function CompanionSessionControls({
  phase,
  enabled = true,
  onStart,
  onStop,
  onPause,
  onResume,
  onInterrupt,
  onRecover,
}: Props) {
  const { t } = useLocale();

  if (phase === 'idle') {
    return (
      <Control
        label={t(
          'startCompanionSession',
        )}
        primary
        disabled={!enabled}
        onPress={onStart}
      />
    );
  }

  if (phase === 'paused') {
    return (
      <View style={styles.row}>
        <Control
          label={t(
            'resumeCompanionSession',
          )}
          primary
          disabled={!enabled}
          onPress={onResume}
        />
        <Control
          label={t(
            'endCompanionSession',
          )}
          onPress={onStop}
        />
      </View>
    );
  }

  if (phase === 'interrupted') {
    return (
      <View style={styles.row}>
        <Control
          label={t(
            'continueCompanionSession',
          )}
          primary
          disabled={!enabled}
          onPress={onRecover}
        />
        <Control
          label={t(
            'endCompanionSession',
          )}
          onPress={onStop}
        />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <Control
        label={t(
          'endCompanionSession',
        )}
        onPress={onStop}
      />
    );
  }

  const canPause =
    phase === 'listening'
    || phase === 'speaking';

  return (
    <View style={styles.row}>
      {canPause ? (
        <Control
          label={t(
            'pauseCompanionSession',
          )}
          disabled={!enabled}
          onPress={onPause}
        />
      ) : null}

      <Control
        label={t(
          'interruptCompanionSession',
        )}
        disabled={!enabled}
        onPress={onInterrupt}
      />

      <Control
        label={t(
          'endCompanionSession',
        )}
        onPress={onStop}
      />
    </View>
  );
}

type ControlProps = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Control({
  label,
  primary = false,
  disabled = false,
  onPress,
}: ControlProps) {
  return (
    <FlagshipActionButton
      label={label}
      primary={primary}
      disabled={disabled}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
