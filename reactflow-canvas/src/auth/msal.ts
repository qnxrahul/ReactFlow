import { LogLevel, PublicClientApplication, type Configuration } from '@azure/msal-browser'

/**
 * MSAL config is driven by Vite env vars.
 *
 * Required:
 * - VITE_MSAL_CLIENT_ID
 *
 * Optional:
 * - VITE_MSAL_AUTHORITY (defaults to common)
 * - VITE_MSAL_REDIRECT_URI (defaults to window.location.origin)
 * - VITE_MSAL_POST_LOGOUT_REDIRECT_URI (defaults to window.location.origin)
 */
export function createMsalInstance() {
  const clientId = (import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined) ?? '00000000-0000-0000-0000-000000000000'
  const authority = (import.meta.env.VITE_MSAL_AUTHORITY as string | undefined) ?? 'https://login.microsoftonline.com/common'
  const redirectUri =
    (import.meta.env.VITE_MSAL_REDIRECT_URI as string | undefined) ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
  const postLogoutRedirectUri =
    (import.meta.env.VITE_MSAL_POST_LOGOUT_REDIRECT_URI as string | undefined) ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost')

  if (!(import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined) && import.meta.env.DEV) {
    console.warn('[msal] VITE_MSAL_CLIENT_ID is not set; MSAL is using a placeholder clientId for now.')
  }

  const config: Configuration = {
    auth: {
      clientId,
      authority,
      redirectUri,
      postLogoutRedirectUri,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Info,
        piiLoggingEnabled: false,
        loggerCallback: (level, message) => {
          if (import.meta.env.DEV) {
            if (level === LogLevel.Error) console.error('[msal]', message)
            else if (level === LogLevel.Warning) console.warn('[msal]', message)
            else console.log('[msal]', message)
          }
        },
      },
    },
  }

  return new PublicClientApplication(config)
}

let cachedInstance: PublicClientApplication | null = null

export function getMsalInstance() {
  if (!cachedInstance) cachedInstance = createMsalInstance()
  return cachedInstance
}

