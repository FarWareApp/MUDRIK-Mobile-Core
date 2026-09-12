import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from '../core/errors/AppErrorBoundary';
import { RootProviders } from '../core/composition/RootProviders';
import { RuntimeStatusBanner } from '../core/runtime/RuntimeStatusBanner';
import { useAccessibility } from '../core/accessibility/AccessibilityProvider';
import { NotificationNavigationBridge } from '../features/notifications/components/NotificationNavigationBridge';

function AppShell() {
  const { reducedMotion } =
    useAccessibility();

  return (
    <>
      <StatusBar style="auto" />

      <RuntimeStatusBanner />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: reducedMotion
            ? 'none'
            : 'fade',
        }}
      />

      <NotificationNavigationBridge />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <RootProviders>
        <AppShell />
      </RootProviders>
    </AppErrorBoundary>
  );
}
