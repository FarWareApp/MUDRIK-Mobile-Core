import React, { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  CompanionSessionPhase,
} from '../../../contracts/Companion';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

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
        label={t('startCompanionSession')}
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
          label={t('resumeCompanionSession')}
          primary
          disabled={!enabled}
          onPress={onResume}
        />
        <Control
          label={t('endCompanionSession')}
          onPress={onStop}
        />
      </View>
    );
  }

  if (phase === 'interrupted') {
    return (
      <View style={styles.row}>
        <Control
          label={t('continueCompanionSession')}
          primary
          disabled={!enabled}
          onPress={onRecover}
        />
        <Control
          label={t('endCompanionSession')}
          onPress={onStop}
        />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <Control
        label={t('endCompanionSession')}
        onPress={onStop}
      />
    );
  }

  return (
    <View style={styles.row}>
      <Control
        label={t('pauseCompanionSession')}
        disabled={!enabled}
        onPress={onPause}
      />
      <Control
        label={t('interruptCompanionSession')}
        disabled={!enabled}
        onPress={onInterrupt}
      />
      <Control
        label={t('endCompanionSession')}
        onPress={onStop}
      />
    </View>
  );
}

type ControlProps = PropsWithChildren<{
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}>;

function Control({
  label,
  primary = false,
  disabled = false,
  onPress,
}: ControlProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        {
          backgroundColor: primary
            ? colors.accent
            : pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
          borderColor: primary
            ? colors.accent
            : colors.border,
          opacity: disabled
            ? 0.44
            : pressed
              ? 0.86
              : 1,
          transform: [
            { scale: pressed && !disabled ? 0.98 : 1 },
          ],
        },
      ]}
    >
      <Text
        style={{
          color: primary
            ? colors.accentText
            : colors.textPrimary,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  control: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
