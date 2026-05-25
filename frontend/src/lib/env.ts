const rawMode = import.meta.env.VITE_APP_MODE

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1'),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  appMode: rawMode === 'PRODUCTION' ? 'PRODUCTION' : 'DEVELOPMENT',
  isProduction: rawMode === 'PRODUCTION',
}
