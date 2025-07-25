import {createRoot} from 'react-dom/client'
import 'react-reflex/styles.css'
import './app.less'

import {Result} from 'antd'
import * as Sentry from '@sentry/react'
import {v4 as uuidv4} from 'uuid'
import {tryGetConfig, getConfig, ApplicationConfig, MsalConfig} from './config'
import {versionCheck} from './versionCheck'
import {AuthProvider} from './AuthProvider'
import AppProvider from './AppProvider'
import {cacheSizes} from '@apollo/client/utilities'
import {ResultStatusType} from 'antd/lib/result'

cacheSizes['inMemoryCache.executeSelectionSet'] = 1_000_000
cacheSizes['inMemoryCache.executeSubSelectedArray'] = 500_000

const errorBanner = (text: string, status: ResultStatusType | undefined = 'error') => (
  <Result status={status} title={text} style={{margin: '0 auto', width: '60%'}} />
)

const MaintenanceModeBanner = errorBanner("I'm currently under maintenance", 'info')
const ConfigLoadErrorBanner = errorBanner('Loading the configuration failed')
const InitErrorBanner = errorBanner('Initializing the app failed')

const initApp = async () => {
  const configTry = tryGetConfig()

  if (!configTry.success) {
    console.error('Failed to load config:', configTry.error)
    return ConfigLoadErrorBanner
  }

  const config: ApplicationConfig = configTry.config

  if (config.maintenance_mode) {
    return MaintenanceModeBanner
  }

  const sessionId = setupMonitoring(config.glitchtipDSN)

  if (await versionCheck()) {
    console.log('Version upgrade done.')
  }

  return (
    <AuthProvider>
      <AppProvider sessionId={sessionId} />
    </AuthProvider>
  )
}

const setupMonitoring = (glitchtipDSN: string) => {
  const sessionId = uuidv4()
  Sentry.init({dsn: glitchtipDSN, initialScope: {sessionId}})
  Sentry.setTag('sessionId', sessionId)
  return sessionId
}

const container = window.document.getElementById('root')
const root = createRoot(container!)

const renderApp = (app: JSX.Element) => {
  document.getElementById('preloader-wrap')?.remove()
  root.render(app)
}

initApp()
  .then(renderApp)
  .catch((error) => {
    console.log(error)
    renderApp(InitErrorBanner)
  })
