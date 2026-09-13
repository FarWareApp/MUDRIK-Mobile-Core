export const lightColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F2F5',
  surfaceInput: '#F4F7FB',
  surfacePressed: '#E8EEF7',
  textPrimary: '#111318',
  textSecondary: '#656B76',
  border: '#E2E5EA',
  accent: '#2F80ED',
  accentSoft: 'rgba(47,128,237,0.14)',
  accentText: '#FFFFFF',
  success: '#1F9D55',
  warning: '#C98300',
  error: '#D92D20',
  overlay: 'rgba(0,0,0,0.38)',
  shadow: 'rgba(17,24,39,0.14)',
} as const;

export const darkColors = {
  background: '#0B0C0F',
  surface: '#15171C',
  surfaceElevated: '#202329',
  surfaceInput: '#1B1E24',
  surfacePressed: '#252A32',
  textPrimary: '#F7F8FA',
  textSecondary: '#A5AAB4',
  border: '#2D3139',
  accent: '#4295F5',
  accentSoft: 'rgba(66,149,245,0.18)',
  accentText: '#FFFFFF',
  success: '#45C97A',
  warning: '#E9A23B',
  error: '#F97066',
  overlay: 'rgba(0,0,0,0.62)',
  shadow: 'rgba(0,0,0,0.42)',
} as const;

export type AppColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceInput: string;
  surfacePressed: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  shadow: string;
};
