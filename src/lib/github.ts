// src/lib/github.ts
// Minimal GitHub REST helpers shared by the public contribution flows
// (/api/contribuer and /api/avis). Each call targets the project repo and
// throws GitHubApiError so routes can log the failing step and return 502.

const GITHUB_API = 'https://api.github.com'

export const GITHUB_REPO = 'Mathieu-Gillet/Plages-accessibles'
export const BASE_BRANCH = 'master'

export class GitHubApiError extends Error {
  constructor(
    public step: string,
    public status: number,
  ) {
    super(`GitHub API error at "${step}": HTTP ${status}`)
  }
}

function headers(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

/** SHA of the latest commit on the base branch. */
export async function getBaseSha(pat: string): Promise<string> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/git/ref/heads/${BASE_BRANCH}`,
    { headers: headers(pat) },
  )
  if (!res.ok) throw new GitHubApiError('read base branch', res.status)
  const data = (await res.json()) as { object: { sha: string } }
  return data.object.sha
}

export async function createBranch(pat: string, branch: string, sha: string): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/git/refs`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  })
  if (!res.ok) throw new GitHubApiError('create branch', res.status)
}

/** Fetch a file from the repo. Returns null when it does not exist. */
export async function getFile(
  pat: string,
  path: string,
  ref: string = BASE_BRANCH,
): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers: headers(pat) },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new GitHubApiError('read file', res.status)
  const data = (await res.json()) as { content: string; sha: string }
  return {
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  }
}

/** Create or update a file on a branch. Pass `sha` when updating an existing file. */
export async function putFile(
  pat: string,
  opts: { path: string; branch: string; content: string; message: string; sha?: string },
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${opts.path}`, {
    method: 'PUT',
    headers: headers(pat),
    body: JSON.stringify({
      message: opts.message,
      content: Buffer.from(opts.content).toString('base64'),
      branch: opts.branch,
      ...(opts.sha ? { sha: opts.sha } : {}),
    }),
  })
  if (!res.ok) throw new GitHubApiError('write file', res.status)
}

/** Number of open PRs whose head branch starts with `prefix`. */
export async function countOpenPullRequests(pat: string, prefix: string): Promise<number> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/pulls?state=open&per_page=100`,
    { headers: headers(pat) },
  )
  if (!res.ok) throw new GitHubApiError('list pull requests', res.status)
  const prs = (await res.json()) as Array<{ head: { ref: string } }>
  return prs.filter((pr) => pr.head.ref.startsWith(prefix)).length
}

/** Open a pull request against the base branch. Returns its html URL. */
export async function createPullRequest(
  pat: string,
  opts: { title: string; head: string; body: string },
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/pulls`, {
    method: 'POST',
    headers: headers(pat),
    body: JSON.stringify({
      title: opts.title,
      head: opts.head,
      base: BASE_BRANCH,
      body: opts.body,
    }),
  })
  if (!res.ok) throw new GitHubApiError('create pull request', res.status)
  const pr = (await res.json()) as { html_url: string }
  return pr.html_url
}
