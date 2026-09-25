/** Types for validate-site.mjs, so the site's TypeScript can import it. */
export interface Issue {
  path: string
  message: string
}
export const SCHEMA_VERSION: number
export const SECTION_TYPES: readonly string[]
export function isSafeUrl(value: unknown): boolean
export function validateSite(doc: unknown): { errors: Issue[]; warnings: Issue[] }
export function formatIssues(issues: Issue[]): string[]
export function listKind(sectionType: string, path: (string | number)[]): unknown
export function itemTemplate(sectionType: string, path?: (string | number)[]): Record<string, unknown>
