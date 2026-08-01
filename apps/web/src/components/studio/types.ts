export interface Material {
  id: string
  title: string
  kind: string
  status: string
  content: string
  content_hash: string
  byte_size: number
  created_at: string
  analysis?: {
    version: number
    generatedAt?: string
    generated_at?: string
    summary?: string
    categories?: string[]
    tags?: string[]
    fragments?: Array<{ index: number; text: string }>
    publicCitations?: Array<{ url: string; host: string }>
    public_citations?: Array<{ url: string; host: string }>
    media?: Array<{
      sourceUrl?: string
      source_url?: string
      archivedUrl?: string
      archived_url?: string
      status: 'archived' | 'failed' | 'pending' | 'ignored'
      error?: string
    }>
  } | null
}

export interface MediaAsset {
  source_url: string
  archived_url?: string
  object_path?: string
  content_hash?: string
  mime_type?: string
  byte_size?: number
  status: 'archived' | 'failed' | 'pending' | 'ignored'
  error?: string
  usage: 'used' | 'unused' | 'unresolved'
  materials: Array<{ id: string; title: string }>
  used_by: Array<{ id: string; title: string; type: 'post' | 'page' }>
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Revision {
  id: string
  version: number
  title: string
  slug: string
  summary?: string | null
  content: string
  category_id: string
  tags: string[]
  metadata?: {
    generation?: {
      mode?: string
      total_tokens?: number
      models?: string[]
      stages?: Array<{
        key: string
        label: string
        duration_ms: number
        provider_id: string
        model: string
        total_tokens: number
      }>
      review?: {
        verdict: 'pass' | 'needs-review' | 'revise'
        issues: Array<{
          severity: 'low' | 'medium' | 'high'
          claim: string
          reason: string
          suggestion: string
        }>
        notes: string[]
        remaining_risks: string[]
      }
    }
  }
  created_at: string
}

export interface Review {
  id: string
  revision_id: string
  status: string
  expires_at: string
  reviewer_email?: string | null
  email_status?: 'not_requested' | 'pending' | 'sent' | 'failed'
  email_error?: string | null
}

export interface Publication {
  id: string
  revision_id: string
  status: string
  core_post_id?: string | null
  scheduled_at?: string | null
  published_at?: string | null
}

export interface Project {
  id: string
  title: string
  goal: string
  status: string
  current_revision_id?: string | null
  approved_revision_id?: string | null
  published_revision_id?: string | null
  core_post_id?: string | null
  created_at: string
  materials?: Material[]
  revisions?: Revision[]
  reviews?: Review[]
  publications?: Publication[]
}

export interface HotspotTheme {
  id: string
  name: string
  keywords: string[]
  daily_quota: number
  enabled: boolean
}

export interface HotspotSource {
  id: string
  theme_id?: string | null
  name: string
  url: string
  format: string
  daily_quota: number
  enabled: boolean
  last_fetched_at?: string | null
  last_error?: string | null
}

export interface HotspotCandidate {
  id: string
  title: string
  url?: string | null
  summary?: string | null
  score: number
  status: 'inbox' | 'selected' | 'dismissed'
  created_at: string
}

export interface AiRole {
  id: string
  slot: string
  provider_id: string
  model: string
  system_prompt: string
  temperature: number
  max_tokens: number
  daily_budget_cents: number
  enabled: boolean
}

export type AiProviderType = 'openai-compatible' | 'anthropic' | 'generic'

export interface AiProvider {
  id: string
  name: string
  type: AiProviderType
  api_key: string
  endpoint?: string
  model_list_url?: string
  append_v1?: boolean
  default_model: string
  enabled: boolean
  context_window?: number | null
  max_tokens?: number | null
  credential_configured?: boolean
}

export interface AiAssignment {
  provider_id: string
  model: string
}

export type AiTaskKey =
  | 'material_analysis'
  | 'topic_planning'
  | 'writing'
  | 'quick_rewrite'
  | 'review'
  | 'fact_check'
  | 'seo'
  | 'summary'
  | 'comment_review'
  | 'translation'
  | 'translation_review'
  | 'insights'
  | 'insights_translation'

export interface AiConfig {
  ready: boolean
  default_provider_id?: string
  default_model?: string
  providers: AiProvider[]
  assignments: Partial<Record<AiTaskKey, AiAssignment>>
  roles: AiRole[]
}
