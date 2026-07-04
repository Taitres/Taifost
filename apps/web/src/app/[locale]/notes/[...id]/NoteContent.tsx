'use client'

import { useTranslation, useViewingOriginal } from '~/atoms/translation'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

import { NoteLexicalRenderer } from './NoteLexicalRenderer'
import {
  NoteMarkdownRenderer,
  NoteTranslationMarkdownRenderer,
} from './NoteMarkdownRenderer'

export function NoteContent({ contentFormat }: { contentFormat?: string }) {
  const viewingOriginal = useViewingOriginal()
  const atomTranslation = useTranslation()
  const providerTranslationText = useCurrentNoteDataSelector(
    (data) => (data as any)?.translation?.text,
  )
  const hasTranslation = !!(atomTranslation?.text || providerTranslationText)

  if (contentFormat === 'lexical') {
    return <NoteLexicalRenderer />
  }

  if (hasTranslation && !viewingOriginal) {
    return <NoteTranslationMarkdownRenderer />
  }

  return <NoteMarkdownRenderer />
}
