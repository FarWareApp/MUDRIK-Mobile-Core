import React from 'react';

import {
  FlagshipActionButton,
} from '../../../design-system/components/FlagshipActionButton';

type Props = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function VoiceControlButton({
  label,
  primary = false,
  disabled = false,
  onPress,
}: Props) {
  return (
    <FlagshipActionButton
      label={label}
      primary={primary}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
