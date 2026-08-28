import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from '../core/errors/AppErrorBoundary';
import { RootProviders } from '../core/composition/RootProviders';
import { RuntimeStatusBanner } from '../core/runtime/RuntimeStatusBanner';
import { NotificationNavigationBridge } from '../features/notifications/components/NotificationNavigationBridge';

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <RootProviders>
        <StatusBar style="auto" />

        <RuntimeStatusBanner />

        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        />

        <NotificationNavigationBridge />
      </RootProviders>
    </AppErrorBoundary>
  );
}
