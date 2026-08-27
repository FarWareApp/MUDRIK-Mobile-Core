import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from '../core/errors/AppErrorBoundary';
import { RootProviders } from '../core/composition/RootProviders';

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <RootProviders>
        <StatusBar style="auto" />

        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </RootProviders>
    </AppErrorBoundary>
  );
}
