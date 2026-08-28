import React, {
  PropsWithChildren,
} from 'react';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {
  ThemeProvider,
} from '../../design-system/theme/ThemeProvider';

import {
  ConnectivityProvider,
} from '../../features/connectivity/ConnectivityProvider';

import {
  ActiveConversationProvider,
} from '../../features/conversations/ActiveConversationProvider';

import {
  LifecycleProvider,
} from '../lifecycle/LifecycleProvider';

import {
  LocaleProvider,
} from '../localization/LocaleProvider';

import {
  RuntimeProvider,
} from '../runtime/RuntimeProvider';

import {
  StorageBootstrapProvider,
} from '../storage/StorageBootstrapProvider';

import {
  appServices,
} from './AppServices';

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
                <ConnectivityProvider
                  service={
                    appServices
                      .connectivityService
                  }
                >
                  <RuntimeProvider>
                    {children}
                  </RuntimeProvider>
                </ConnectivityProvider>
              </LifecycleProvider>
            </ActiveConversationProvider>
          </StorageBootstrapProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
