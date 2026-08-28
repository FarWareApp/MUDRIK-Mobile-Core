export type TextDirection =
  | 'rtl'
  | 'ltr';

const RTL_CHARACTER =
  /[\u0590-\u08FF]/;

const LATIN_CHARACTER =
  /[A-Za-zÀ-ÖØ-öø-ÿ]/;

export function resolveTextDirection(
  text: string,
  fallback:
    TextDirection = 'ltr',
): TextDirection {
  for (const character of text) {
    if (
      RTL_CHARACTER.test(
        character,
      )
    ) {
      return 'rtl';
    }

    if (
      LATIN_CHARACTER.test(
        character,
      )
    ) {
      return 'ltr';
    }
  }

  return fallback;
}
