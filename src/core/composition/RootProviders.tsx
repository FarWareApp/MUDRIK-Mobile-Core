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
  NotificationProvider,
} from '../../features/notifications/NotificationProvider';

import {
  AccessibilityProvider,
} from '../accessibility/AccessibilityProvider';

import {
  DiagnosticsProvider,
} from '../diagnostics/DiagnosticsProvider';

import {
  CoreHealthProvider,
} from '../health/CoreHealthProvider';

import {
  LifecycleProvider,
} from '../lifecycle/LifecycleProvider';

import {
  AppDirectionBoundary,
} from '../localization/AppDirectionBoundary';

import {
  LocaleProvider,
} from '../localization/LocaleProvider';

import {
  RuntimeProvider,
} from '../runtime/RuntimeProvider';

import {
  AppSettingsProvider,
} from '../settings/AppSettingsProvider';

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
      <StorageBootstrapProvider>
        <AppSettingsProvider
          repository={
            appServices
              .settingsRepository
          }
        >
          <DiagnosticsProvider
            repository={
              appServices
                .diagnosticRepository
            }
          >
            <ThemeProvider>
              <LocaleProvider>
              <AccessibilityProvider>
                <AppDirectionBoundary>
                  <ActiveConversationProvider>
                    <LifecycleProvider>
                      <ConnectivityProvider
                        service={
                          appServices
                            .connectivityService
                        }
                      >
                        <RuntimeProvider>
                          <NotificationProvider
                            service={
                              appServices
                                .notificationService
                            }
                          >
                            <CoreHealthProvider>
                              {children}
                            </CoreHealthProvider>
                          </NotificationProvider>
                        </RuntimeProvider>
                      </ConnectivityProvider>
                    </LifecycleProvider>
                  </ActiveConversationProvider>
                </AppDirectionBoundary>
              </AccessibilityProvider>
              </LocaleProvider>
            </ThemeProvider>
          </DiagnosticsProvider>
        </AppSettingsProvider>
      </StorageBootstrapProvider>
    </SafeAreaProvider>
  );
}
