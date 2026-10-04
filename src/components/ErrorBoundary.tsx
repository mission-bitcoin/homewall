import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time crashes and shows them on screen. Without this, any error
 * unmounts the whole tree and leaves a blank page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('HomeWall crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          margin: 16,
          padding: 16,
          border: '1px solid #ef4444',
          borderRadius: 12,
          background: '#131c2e',
          color: '#e6edf7',
          font: '14px/1.5 system-ui,sans-serif',
        }}
      >
        <strong style={{ color: '#ef4444' }}>HomeWall hit an error</strong>
        <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0', color: '#93a4bd' }}>
          {String(this.state.error.stack || this.state.error)}
        </pre>
        <p style={{ margin: '8px 0 0', color: '#93a4bd' }}>Browser: {navigator.userAgent}</p>
      </div>
    )
  }
}
