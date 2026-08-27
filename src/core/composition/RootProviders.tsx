import React, { PropsWithChildren } from 'react';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '../../design-system/theme/ThemeProvider';
import { ActiveConversationProvider } from '../../features/conversations/ActiveConversationProvider';
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
            <ActiveConversationProvider>
              <LifecycleProvider>
                {children}
              </LifecycleProvider>
            </ActiveConversationProvider>
          </StorageBootstrapProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
