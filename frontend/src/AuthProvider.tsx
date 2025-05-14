import {createContext, PropsWithChildren, useEffect, useState} from 'react'

import {ApplicationConfig, getConfig, MsalConfig} from './config'
import LoginScreen from './LoginScreen'
import {MsalProvider} from '@azure/msal-react'
import {
  EventType,
  PublicClientApplication,
  InteractionRequiredAuthError,
  IPublicClientApplication,
} from '@azure/msal-browser'
import jwt_decode from 'jwt-decode'
import {AnyIfEmpty} from 'react-redux'
import localforage from 'localforage'
import {get} from 'lodash'

type AuthContextValue = {getTokenAsync: () => Promise<string>; username: string}
export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export type AuthData = {
  msalInstance: PublicClientApplication | null
}

export type AuthProviderProps = PropsWithChildren<{}>

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [token, setToken] = useState('')
  const [loginType, setLoginType] = useState('')

  const config = getConfig()
  const authData = setupAuth(config)
  const msalInstance = authData.msalInstance

  const getTokenAsync = async () => await asyncTokenLookup(msalInstance, config)

  useEffect(() => {
    async function getToken() {
      const loginInfo = await asyncLogin(msalInstance, config)
      if (loginInfo.token) {
        setToken(loginInfo.token)
        setLoginType(loginInfo.type)
      }
    }

    if (!token) getToken()
  }, [])

  if (!token) {
    const handleMsalLogin = () => {
      if (msalInstance && config.msal)
        msalInstance.loginPopup({scopes: config.msal.scopes}).catch((e) => {
          console.error(e)
        })
      else console.error('MSAL not configured properly')
    }

    return <LoginScreen loginOptions={config.loginOptions} i18n={config.i18n} handleMsalLogin={handleMsalLogin} />
  }

  let username = 'Developer'

  switch (loginType) {
    case 'dev':
      break
    case 'msal':
      const decodedToken: any = jwt_decode(token)
      username = decodedToken?.name
      break
    case 'password':
      // TODO
      break
  }

  console.log(loginType, token)

  const isDevAuth = loginType == 'dev'
  const isPasswordAuth = loginType == 'password'
  const loggedInWithoutMsal = isDevAuth || isPasswordAuth

  if (loggedInWithoutMsal) {
    return <AuthContext.Provider value={{getTokenAsync, username}}>{children}</AuthContext.Provider>
  }

  if (!msalInstance) throw new Error('MSAL auth is enabled but config is not given')

  return (
    <AuthContext.Provider value={{getTokenAsync, username}}>
      <MsalProvider instance={msalInstance}>{children}</MsalProvider>
    </AuthContext.Provider>
  )
}

const setupAuth = (config: ApplicationConfig) => {
  let authData: AuthData = {msalInstance: null}

  if (config.loginOptions.msal) {
    if (!config.msal) throw new Error('MSAL auth is enabled but config is not given')

    let msalInstance = new PublicClientApplication({
      auth: {...config.msal.auth, redirectUri: `${window.location.protocol}//${window.location.host}`},
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
    })

    msalInstance.addEventCallback(async (message: any) => {
      if (message.eventType === EventType.LOGIN_SUCCESS) {
        const info = jwt_decode<any>(message.payload.accessToken)
        console.log(await localforage.getItem('__msal_sub'))
        const storedSub: string | null = await localforage.getItem('__msal_sub')

        if (storedSub && storedSub !== info.sub) {
          await localforage.removeItem('persist:__MEDCONB__WORKSPACE')
          await localforage.removeItem('persist:__MEDCONB__CHANGES')
          await localforage.removeItem('persist:__MEDCONB__UI')
        }
        await localforage.setItem('__msal_sub', info.sub)
      }
    })

    authData.msalInstance = msalInstance
  }

  return authData
}

const qd = {} as Record<string, string>
if (location.search)
  location.search
    .substring(1)
    .split(`&`)
    .forEach((item) => {
      let [k, v] = item.split(`=`)
      v = v && decodeURIComponent(v)
      ;(qd[k] = qd[k] || []).push(v)
    })

const getMsalToken = async (instance: IPublicClientApplication, scopes: string[]) => {
  const accounts = instance.getAllAccounts()
  const account = get(accounts, '[0]')

  if (!account) {
    await instance.acquireTokenPopup({scopes})
    return ''
  }
  try {
    const result = await instance.acquireTokenSilent({scopes, account})
    return result.accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // fallback to interaction when silent call fails
      await instance.acquireTokenPopup({scopes})
    }
  }
  return ''
}

const getPasswordToken = async () => {
  return ''
}

const asyncTokenLookup = async (instance: IPublicClientApplication | null, config: ApplicationConfig) => {
  return (await asyncLogin(instance, config))?.token
}

const asyncLogin = async (
  instance: IPublicClientApplication | null,
  config: ApplicationConfig,
): Promise<{token: string; type: string}> => {
  // todo: remove
  if (config.loginOptions.dev && config.dev_token && qd.dev_auth) {
    return {token: config.dev_token, type: 'dev'}
  }

  if (config.loginOptions.msal && instance) {
    if (!config.msal) throw new Error('MSAL auth is enabled but config is not given')
    return {token: await getMsalToken(instance, config.msal.scopes), type: 'msal'}
  }

  if (config.loginOptions.password) {
    return {token: await getPasswordToken(), type: 'password'}
  }

  return {token: '', type: ''}
}
