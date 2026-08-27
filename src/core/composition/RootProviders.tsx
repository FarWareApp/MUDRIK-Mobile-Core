import React, { PropsWithChildren } from 'react';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../../design-system/theme/ThemeProvider';
import { LifecycleProvider } from '../lifecycle/LifecycleProvider';
import { LocaleProvider } from '../localization/LocaleProvider';
import { StorageBootstrapProvider } from '../storage/StorageBootstrapProvider';

export function RootProviders({
  children,
}: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
      <LocaleProvider>
        <StorageBootstrapProvider>
          <LifecycleProvider>
            {children}
          </LifecycleProvider>
        </StorageBootstrapProvider>
      </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
