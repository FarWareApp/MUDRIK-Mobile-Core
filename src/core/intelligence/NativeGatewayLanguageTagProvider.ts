import {
  getLocales,
} from 'expo-localization';

const LANGUAGE_TAG =
  /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function normalizeGatewayLanguageTag(
  languageTag:
    string | null | undefined,
  languageCode:
    string | null | undefined,
): string {
  const full =
    languageTag?.trim();

  if (
    full
    && LANGUAGE_TAG.test(full)
  ) {
    return full;
  }

  const code =
    languageCode
      ?.trim()
      .toLowerCase();

  if (
    code
    && LANGUAGE_TAG.test(code)
  ) {
    return code;
  }

  return 'en';
}

export function getNativeGatewayLanguageTag():
  string {
  try {
    const first =
      getLocales()[0];

    return normalizeGatewayLanguageTag(
      first?.languageTag,
      first?.languageCode,
    );
  } catch {
    return 'en';
  }
}
