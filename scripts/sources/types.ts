// scripts/sources/types.ts
// Common interface that every data source adapter must implement.
// A "Source" returns raw beach candidates; the orchestrator dedupes, validates and writes them.

import type { Candidate } from '../lib/validate-candidate'

export interface Source {
  /** Human-readable name shown in logs and PR body. */
  name: string
  /** Fetch raw candidates from this source. Network/parse errors should throw. */
  fetch(): Promise<Candidate[]>
}
