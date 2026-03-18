import { useColorScheme } from 'react-native';

export const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  primary: '#2B83FF',
  primaryBg: '#EFF6FF',
  danger: '#FF6A7B'
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  primaryBg: '#1E3A8A',
  danger: '#F43F5E'
};

export const useAppTheme = () => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
};