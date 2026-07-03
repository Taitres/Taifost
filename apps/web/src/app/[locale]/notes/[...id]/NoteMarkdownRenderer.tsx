'use client'

import { RuleType } from 'markdown-to-jsx'

import { useTranslation } from '~/atoms/translation'
import { MainMarkdown, type MarkdownToJSX } from '~/components/ui/markdown'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

const MarkdownRenderers: Partial<MarkdownToJSX.PartialRules> = {
  [RuleType.text]: {
    render(node: MarkdownToJSX.TextNode, _: any, state?: MarkdownToJSX.State) {
      return <span key={state?.key as React.Key}>{node.text}</span>
    },
  },
}

export const NoteMarkdownRenderer = () => {
  const text = useCurrentNoteDataSelector((data) => data?.data.text)
  if (!text) return null
  return (
    <MainMarkdown
      className="mt-10"
      allowsScript
      renderers={MarkdownRenderers}
      variant="note"
      value={text}
    />
  )
}

export const NoteTranslationMarkdownRenderer = () => {
  const providerTranslationText = useCurrentNoteDataSelector(
    (data) => (data as any)?.translation?.text,
  )
  const atomTranslation = useTranslation()
  const translationText = atomTranslation?.text || providerTranslationText
  if (!translationText) return null
  return (
    <MainMarkdown
      className="mt-10"
      allowsScript
      renderers={MarkdownRenderers}
      variant="note"
      value={translationText}
    />
  )
}
