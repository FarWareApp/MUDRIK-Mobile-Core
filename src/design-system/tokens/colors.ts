export const lightColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F2F5',
  textPrimary: '#111318',
  textSecondary: '#656B76',
  border: '#E2E5EA',
  accent: '#2F80ED',
  accentText: '#FFFFFF',
  success: '#1F9D55',
  warning: '#C98300',
  error: '#D92D20',
  overlay: 'rgba(0,0,0,0.38)',
} as const;

export const darkColors = {
  background: '#0B0C0F',
  surface: '#15171C',
  surfaceElevated: '#202329',
  textPrimary: '#F7F8FA',
  textSecondary: '#A5AAB4',
  border: '#2D3139',
  accent: '#4295F5',
  accentText: '#FFFFFF',
  success: '#45C97A',
  warning: '#E9A23B',
  error: '#F97066',
  overlay: 'rgba(0,0,0,0.62)',
} as const;

export type AppColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
};
