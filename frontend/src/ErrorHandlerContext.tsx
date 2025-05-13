import {createContext} from 'react'

type ErrorHandlerContextValue = {
  onError: (err: Error) => void
  sessionId: string
}
const ErrorHandlerContext = createContext<ErrorHandlerContextValue>({} as ErrorHandlerContextValue)

export default ErrorHandlerContext
