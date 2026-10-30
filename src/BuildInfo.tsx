import { REPO_URL } from './repo'

/** Bottom-left build stamp: version, commit (links to it) and build time, to confirm the deployed version. */
export function BuildInfo() {
  const { version, sha, time } = __BUILD__
  const when = new Date(time).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const dev = import.meta.env.DEV
  return (
    <a className="build-info" href={sha ? `${REPO_URL}/commit/${sha}` : REPO_URL} target="_blank" rel="noreferrer" title="Build: version, commit, time">
      v{version}{dev ? ' dev' : ''} · {sha || 'local'} · {when}
    </a>
  )
}
