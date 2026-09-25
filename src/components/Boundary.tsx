import { Component, type ReactNode } from 'react'
import { reportRenderError } from '../lib/errors'

const NONE = Symbol('none')

interface Props {
  /** Named in the console message, e.g. `section "projects"`. */
  where: string
  /**
   * Whatever the children render from. When it changes after a failure, the
   * boundary tries again: a corrected document should not stay hidden until
   * the next page load.
   */
  resetKey?: unknown
  /** Shown instead of the children after a failure. Nothing by default. */
  fallback?: ReactNode
  onError?: (error: unknown) => void
  children: ReactNode
}

interface State {
  failed: boolean
  /** The resetKey that failed; NONE until componentDidCatch has recorded it. */
  failedFor: unknown
}

/**
 * Keeps one bad piece of content from blanking the page.
 *
 * React unmounts everything above an uncaught render error, so without this a
 * single malformed item saved from the editor took the whole site down for
 * every visitor. The CMS validator is the first line of defence; this is the
 * second, for whatever it misses.
 */
export class Boundary extends Component<Props, State> {
  state: State = { failed: false, failedFor: NONE }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Only once the failing key is recorded; otherwise the retry render right
    // after the error would reset it and fail a second time.
    if (state.failed && state.failedFor !== NONE && props.resetKey !== state.failedFor) {
      return { failed: false, failedFor: NONE }
    }
    return null
  }

  componentDidCatch(error: unknown) {
    this.setState({ failedFor: this.props.resetKey })
    reportRenderError(error, this.props.where)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
