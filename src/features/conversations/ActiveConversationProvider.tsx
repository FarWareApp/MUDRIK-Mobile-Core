import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

type ActiveConversationContextValue = {
  activeConversationId: string | null;
  activateConversation: (id: string) => void;
  clearActiveConversation: () => void;
};

const ActiveConversationContext =
  createContext<ActiveConversationContextValue | null>(null);

export function ActiveConversationProvider({
  children,
}: PropsWithChildren) {
  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState<string | null>(null);

  const value =
    useMemo<ActiveConversationContextValue>(
      () => ({
        activeConversationId,

        activateConversation: (id) => {
          setActiveConversationId(id);
        },

        clearActiveConversation: () => {
          setActiveConversationId(null);
        },
      }),
      [activeConversationId],
    );

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

export function useActiveConversation():
  ActiveConversationContextValue {
  const value =
    useContext(ActiveConversationContext);

  if (!value) {
    throw new Error(
      'useActiveConversation must be used inside ActiveConversationProvider',
    );
  }

  return value;
}
