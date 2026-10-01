import React, {
  type PropsWithChildren,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';

type Props =
  PropsWithChildren<{
    title: string;
    description?: string;
  }>;

export function CompanionEditorSection({
  title,
  description,
  children,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>

        {description ? (
          <Text
            style={[
              styles.description,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <InsetSurfaceCard
        style={styles.card}
      >
        {children}
      </InsetSurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
  heading: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    ...typeScale.secondary,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  card: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
