import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../design-system/theme/ThemeProvider';
import { runAppMaintenance } from '../composition/runAppMaintenance';
import { initializeStorage } from './initializeStorage';

type BootstrapState =
  | 'initializing'
  | 'ready'
  | 'error';

export function StorageBootstrapProvider({
  children,
}: PropsWithChildren) {
  const { colors } = useTheme();

  const [state, setState] =
    useState<BootstrapState>('initializing');

  const initialize = useCallback(async () => {
    setState('initializing');

    try {
      await initializeStorage();
      await runAppMaintenance();
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (state === 'ready') {
    return children;
  }

  if (state === 'error') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          Storage initialization failed
        </Text>

        <Text
          style={[
            styles.body,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          MUDRIK could not prepare local application data.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry storage initialization"
          onPress={() => {
            void initialize();
          }}
          style={[
            styles.button,
            {
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accentText,
              fontWeight: '700',
            }}
          >
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ActivityIndicator
        size="small"
        color={colors.accent}
      />

      <Text
        style={[
          styles.loading,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        Preparing MUDRIK…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },

  body: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },

  loading: {
    marginTop: 12,
    fontSize: 14,
  },

  button: {
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderRadius: 22,
  },
});
