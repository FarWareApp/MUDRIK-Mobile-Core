import React, {
  useState,
} from 'react';

import {
  isMessageTextWithinLimit,
} from '../messageTextPolicy';
import {
  ComposerAttachmentButton,
} from './composer/ComposerAttachmentButton';
import {
  ComposerCharacterCounter,
} from './composer/ComposerCharacterCounter';
import {
  ComposerSendButton,
} from './composer/ComposerSendButton';
import {
  ComposerSurface,
} from './composer/ComposerSurface';
import {
  ComposerTextInput,
} from './composer/ComposerTextInput';
import {
  ComposerVoiceButton,
} from './composer/ComposerVoiceButton';

type Props = {
  value: string;
  sending: boolean;
  onChangeText: (text: string) => void;
  onSend: (text: string) => Promise<void>;
  onStop: () => void;
  onAttachmentsPress?: () => void;
  attachmentCount?: number;
  onVoicePress?: () => void;
};

export function MessageComposer({
  value,
  sending,
  onChangeText,
  onSend,
  onStop,
  onAttachmentsPress,
  attachmentCount = 0,
  onVoicePress,
}: Props) {
  const [focused, setFocused] = useState(false);

  const canSend =
    (
      value.trim().length > 0
      || attachmentCount > 0
    )
    && isMessageTextWithinLimit(value)
    && !sending;

  const submit = async () => {
    if (!canSend) {
      return;
    }

    await onSend(value);
  };

  return (
    <ComposerSurface
      focused={focused && !sending}
      footer={
        <ComposerCharacterCounter
          value={value}
        />
      }
    >
      <ComposerAttachmentButton
        attachmentCount={attachmentCount}
        disabled={sending}
        onPress={onAttachmentsPress}
      />

      <ComposerTextInput
        value={value}
        editable={!sending}
        onChangeText={onChangeText}
        onFocusChange={setFocused}
      />

      <ComposerVoiceButton
        disabled={sending}
        onPress={onVoicePress}
      />

      <ComposerSendButton
        sending={sending}
        canSend={canSend}
        onSend={() => {
          void submit();
        }}
        onStop={onStop}
      />
    </ComposerSurface>
  );
}
