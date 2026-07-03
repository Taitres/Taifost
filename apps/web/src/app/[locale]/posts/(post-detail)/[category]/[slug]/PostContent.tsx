import { useTranslation, useViewingOriginal } from '~/atoms/translation'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

import { PostLexicalRenderer } from './PostLexicalRenderer'
import {
  PostMarkdownRenderer,
  PostTranslationMarkdownRenderer,
} from './PostMarkdownRenderer'

export function PostContent({ contentFormat }: { contentFormat?: string }) {
  const viewingOriginal = useViewingOriginal()
  const atomTranslation = useTranslation()
  const providerTranslationText = useCurrentPostDataSelector(
    (data) => (data as any)?.translation?.text,
  )
  const hasTranslation = !!(atomTranslation?.text || providerTranslationText)

  if (contentFormat === 'lexical') {
    return <PostLexicalRenderer />
  }

  if (hasTranslation && !viewingOriginal) {
    return <PostTranslationMarkdownRenderer />
  }

  return <PostMarkdownRenderer />
}
