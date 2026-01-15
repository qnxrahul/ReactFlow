import { useCallback, useMemo, useState } from 'react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'

const defaultScopes = ['User.Read']

export default function MsalAuthTest() {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const activeAccount = useMemo(() => {
    const current = instance.getActiveAccount()
    return current ?? accounts[0] ?? null
  }, [accounts, instance])

  const [tokenResult, setTokenResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const missingClientId = !(import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined)

  const login = useCallback(async () => {
    setError('')
    setTokenResult('')
    await instance.loginPopup({
      scopes: defaultScopes,
      prompt: 'select_account',
    })
  }, [instance])

  const logout = useCallback(async () => {
    setError('')
    setTokenResult('')
    await instance.logoutPopup({
      account: activeAccount ?? undefined,
    })
  }, [activeAccount, instance])

  const acquireToken = useCallback(async () => {
    setError('')
    setTokenResult('')

    if (!activeAccount) {
      setError('No active account. Please sign in first.')
      return
    }

    try {
      const res = await instance.acquireTokenSilent({
        account: activeAccount,
        scopes: defaultScopes,
      })
      setTokenResult(JSON.stringify({ ...res, accessToken: '(redacted)' }, null, 2))
    } catch (e) {
      // If silent fails, prompt interactively.
      if (e instanceof InteractionRequiredAuthError) {
        const res = await instance.acquireTokenPopup({
          account: activeAccount,
          scopes: defaultScopes,
        })
        setTokenResult(JSON.stringify({ ...res, accessToken: '(redacted)' }, null, 2))
        return
      }
      setError(String(e))
    }
  }, [activeAccount, instance])

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>MSAL Auth Test</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={login} disabled={inProgress !== 'none'}>
          Sign in (popup)
        </button>
        <button onClick={logout} disabled={!isAuthenticated || inProgress !== 'none'}>
          Sign out (popup)
        </button>
        <button onClick={acquireToken} disabled={!isAuthenticated || inProgress !== 'none'}>
          Acquire token (User.Read)
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <strong>Authenticated:</strong> {String(isAuthenticated)}
        </div>
        <div>
          <strong>In progress:</strong> {inProgress}
        </div>
        <div>
          <strong>Active account:</strong>{' '}
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
            {activeAccount ? `${activeAccount.username} (${activeAccount.homeAccountId})` : '(none)'}
          </span>
        </div>
      </div>

      {error && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #fecdd3',
            background: '#fff1f2',
            color: '#7f1d1d',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </pre>
      )}

      {tokenResult && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#0f172a',
            whiteSpace: 'pre-wrap',
          }}
        >
          {tokenResult}
        </pre>
      )}

      <div style={{ marginTop: 14, color: '#475569', fontSize: 13 }}>
        Configure env vars: <code>VITE_MSAL_CLIENT_ID</code> (required), <code>VITE_MSAL_AUTHORITY</code> (optional).
        {missingClientId && (
          <div style={{ marginTop: 8, color: '#b91c1c' }}>
            Missing <code>VITE_MSAL_CLIENT_ID</code> — sign-in will fail until you set it.
          </div>
        )}
      </div>
    </div>
  )
}

