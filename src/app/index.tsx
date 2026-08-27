import React from 'react';

import { appServices } from '../core/composition/AppServices';
import { ChatScreen } from '../features/chat/ChatScreen';

export default function HomeRoute() {
  return (
    <ChatScreen
      transport={appServices.messageTransport}
    />
  );
}
