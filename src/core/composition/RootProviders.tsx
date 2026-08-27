import React, { PropsWithChildren } from 'react';

import { ThemeProvider } from '../../design-system/theme/ThemeProvider';
import { LifecycleProvider } from '../lifecycle/LifecycleProvider';
import { LocaleProvider } from '../localization/LocaleProvider';

export function RootProviders({
  children,
}: PropsWithChildren) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <LifecycleProvider>
          {children}
        </LifecycleProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
