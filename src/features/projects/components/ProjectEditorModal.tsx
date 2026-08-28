import React, {
  useEffect,
  useState,
} from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';

type Props = {
  visible: boolean;

  title: string;

  initialName?: string;
  initialDescription?: string;

  onCancel: () => void;

  onSave: (
    name: string,
    description: string,
  ) => void;
};

export function ProjectEditorModal({
  visible,
  title,
  initialName = '',
  initialDescription = '',
  onCancel,
  onSave,
}: Props) {
  const { colors } =
    useTheme();

  const [name, setName] =
    useState(initialName);

  const [
    description,
    setDescription,
  ] = useState(
    initialDescription,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(initialName);
    setDescription(
      initialDescription,
    );
  }, [
    initialDescription,
    initialName,
    visible,
  ]);

  const canSave =
    name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        onCancel
      }
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.overlay}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor:
                colors.surface,
            },
          ]}
        >
          <Text
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

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Project name"
            placeholderTextColor={
              colors.textSecondary
            }
            maxLength={120}
            style={[
              styles.input,
              {
                color:
                  colors.textPrimary,
                borderColor:
                  colors.border,
              },
            ]}
          />

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Description"
            placeholderTextColor={
              colors.textSecondary
            }
            multiline
            maxLength={2000}
            style={[
              styles.description,
              {
                color:
                  colors.textPrimary,
                borderColor:
                  colors.border,
              },
            ]}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={styles.action}
            >
              <Text
                style={{
                  color:
                    colors.textSecondary,
                }}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={!canSave}
              onPress={() =>
                onSave(
                  name,
                  description,
                )
              }
              style={[
                styles.save,
                {
                  backgroundColor:
                    canSave
                      ? colors.accent
                      : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    canSave
                      ? colors.accentText
                      : colors.textSecondary,
                  fontWeight: '700',
                }}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent:
        'center',
      padding: 22,
      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    card: {
      borderRadius: 22,
      padding: 18,
    },

    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
    },

    input: {
      minHeight: 48,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 13,
      fontSize: 15,
    },

    description: {
      minHeight: 110,
      marginTop: 12,
      borderWidth: 1,
      borderRadius: 14,
      padding: 13,
      fontSize: 14,
      textAlignVertical:
        'top',
    },

    actions: {
      marginTop: 18,
      flexDirection: 'row',
      justifyContent:
        'flex-end',
      gap: 10,
    },

    action: {
      minHeight: 42,
      justifyContent:
        'center',
      paddingHorizontal: 16,
    },

    save: {
      minHeight: 42,
      borderRadius: 21,
      justifyContent:
        'center',
      paddingHorizontal: 20,
    },
  });
