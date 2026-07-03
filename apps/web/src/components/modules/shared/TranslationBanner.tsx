'use client'

import { useLocale, useTranslations } from 'next-intl'

import {
  setViewingOriginal,
  useTranslation,
  useTranslationPending,
  useViewingOriginal,
} from '~/atoms/translation'
import { StyledButton } from '~/components/ui/button'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

const languageNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
}

export const PostTranslationBanner = () => {
  const t = useTranslations('translation')
  const locale = useLocale()
  const translation = useTranslation()
  const viewingOriginal = useViewingOriginal()
  const pending = useTranslationPending()

  const postTranslation = useCurrentPostDataSelector(
    (data) => (data as any)?.translation,
  )

  const activeTranslation = translation || postTranslation

  if (!activeTranslation) return null

  const sourceLang =
    languageNames[activeTranslation.sourceLang] || activeTranslation.sourceLang

  return (
    <div className="mb-6 rounded-lg border border-accent/20 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="i-mingcute-translate-2-line text-lg" />
        <span className="font-medium">{t('banner_title')}</span>
      </div>
      <p className="mb-3 text-sm opacity-80">
        {t('banner_description')}
        {sourceLang && (
          <span> {t('banner_translatedFrom', { language: sourceLang })}</span>
        )}
      </p>
      {pending && (
        <p className="mb-2 text-sm italic opacity-60">{t('content_updated')}</p>
      )}
      <div className="flex gap-2">
        <StyledButton
          variant={viewingOriginal ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setViewingOriginal(!viewingOriginal)
          }}
        >
          {viewingOriginal ? t('original_mode') : t('banner_viewOriginal')}
        </StyledButton>
      </div>
    </div>
  )
}

export const NoteTranslationBanner = () => {
  const t = useTranslations('translation')
  const locale = useLocale()
  const translation = useTranslation()
  const viewingOriginal = useViewingOriginal()
  const pending = useTranslationPending()

  const noteTranslation = useCurrentNoteDataSelector(
    (data) => (data as any)?.translation,
  )

  const activeTranslation = translation || noteTranslation

  if (!activeTranslation) return null

  const sourceLang =
    languageNames[activeTranslation.sourceLang] || activeTranslation.sourceLang

  return (
    <div className="mb-6 rounded-lg border border-accent/20 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="i-mingcute-translate-2-line text-lg" />
        <span className="font-medium">{t('banner_title')}</span>
      </div>
      <p className="mb-3 text-sm opacity-80">
        {t('banner_description')}
        {sourceLang && (
          <span> {t('banner_translatedFrom', { language: sourceLang })}</span>
        )}
      </p>
      {pending && (
        <p className="mb-2 text-sm italic opacity-60">{t('content_updated')}</p>
      )}
      <div className="flex gap-2">
        <StyledButton
          variant={viewingOriginal ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setViewingOriginal(!viewingOriginal)
          }}
        >
          {viewingOriginal ? t('original_mode') : t('banner_viewOriginal')}
        </StyledButton>
      </div>
    </div>
  )
}
