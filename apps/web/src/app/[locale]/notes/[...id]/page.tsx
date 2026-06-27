import './page.css'

import type {
  ModelWithLiked,
  ModelWithTranslation,
  NoteModel,
} from '@mx-space/api-client'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AckRead } from '~/components/common/AckRead'
import { ClientOnly } from '~/components/common/ClientOnly'
import { CommentAreaRootLazy } from '~/components/modules/comment'
import {
  NoteActionAside,
  NoteBottomBarAction,
  NoteBottomTopic,
  NoteFooterNavigationBarForMobile,
  NoteMetaBar,
  NotePasswordForm,
} from '~/components/modules/note'
import {
  NoteBanner,
  NoteRootBanner,
} from '~/components/modules/note/NoteBanner'
import { NoteFontSettingFab } from '~/components/modules/note/NoteFontFab'
import { NoteMainContainer } from '~/components/modules/note/NoteMainContainer'
import { BanCopyWrapper } from '~/components/modules/shared/BanCopyWrapper'
import { ReadIndicatorForMobile } from '~/components/modules/shared/ReadIndicator'
import { TocFAB } from '~/components/modules/toc/TocFAB'
import { TocHeadingStrategyProvider } from '~/components/modules/toc/TocHeadingStrategy'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import { OnlyMobile } from '~/components/ui/viewport/OnlyMobile'
import { getOgUrl } from '~/lib/helper.server'
import { getSummaryFromMd } from '~/lib/markdown'
import { definePrerenderPage } from '~/lib/request.server'
import {
  buildLanguageAlternates,
  buildLocalePrefixedPath,
  getSupportedLocalesFromTranslations,
} from '~/lib/seo/hreflang'
import {
  CurrentNoteDataProvider,
  SyncNoteDataAfterLoggedIn,
} from '~/providers/note/CurrentNoteDataProvider'
import { CurrentNoteNidProvider } from '~/providers/note/CurrentNoteIdProvider'
import { LayoutRightSidePortal } from '~/providers/shared/LayoutRightSideProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'

import { Paper } from '../../../../components/layout/container/Paper'
import { NoteHeadCover } from '../../../../components/modules/note/NoteHeadCover'
import { NoteHideIfSecret } from '../../../../components/modules/note/NoteHideIfSecret'
import type { NoteDataResult } from './api'
import { getData } from './api'
import { NoteContent } from './NoteContent'
import {
  IndentArticleContainer,
  MarkdownSelection,
  NoteDataReValidate,
  NoteHeaderDate,
  NoteMarkdownImageRecordProvider,
  NoteTitle,
} from './pageExtra'
import { Transition } from './Transition'

type NoteWithTranslation = ModelWithLiked<ModelWithTranslation<NoteModel>>

export const dynamic = 'force-dynamic'

function PageInner({
  data,
  privateLoginOnlyMessage,
}: {
  data: NoteWithTranslation
  privateLoginOnlyMessage: string
}) {
  return (
    <>
      <AckRead id={data.id} type="note" />

      <NoteHeadCover image={data.meta?.cover} />

      <div>
        <NoteTitle />
        <span className="flex flex-wrap items-center text-sm text-neutral/60">
          <NoteHeaderDate />

          <NoteMetaBar />
        </span>

        <NoteRootBanner />
        {!data.isPublished && (
          <NoteBanner type="warning" message={privateLoginOnlyMessage} />
        )}
      </div>

      <NoteHideIfSecret>
        <WrappedElementProvider eoaDetect>
          <ReadIndicatorForMobile />
          <NoteMarkdownImageRecordProvider>
            <BanCopyWrapper>
              <MarkdownSelection>
                <IndentArticleContainer
                  prose={data.contentFormat !== 'lexical'}
                >
                  <header className="sr-only">
                    <NoteTitle />
                  </header>
                  <NoteContent contentFormat={data.contentFormat} />
                </IndentArticleContainer>
              </MarkdownSelection>
            </BanCopyWrapper>
          </NoteMarkdownImageRecordProvider>

          <LayoutRightSidePortal>
            <NoteActionAside />
          </LayoutRightSidePortal>
        </WrappedElementProvider>
      </NoteHideIfSecret>
      {/* <SubscribeBell defaultType="note_c" /> */}
      <ClientOnly>
        <div className="mt-8" data-hide-print />
        <NoteBottomBarAction />
        <NoteBottomTopic />
        <NoteFooterNavigationBarForMobile />
      </ClientOnly>
    </>
  )
}

type NoteDetailPageParams = LocaleParams & {
  // Catch-all: either a numeric nid (`1`) or the v3 date+slug path
  // (`2026/6/17/fix-api-v3-aggregate-not-found-error`).
  id: string[] | string
  password?: string
}
export const generateMetadata = async (props: {
  params: Promise<NoteDetailPageParams>
  searchParams?: Promise<{
    password?: string | string[]
    lang?: string
  }>
}): Promise<Metadata> => {
  const params = await props.params
  const searchParams = (await props.searchParams) ?? {}
  const password = Array.isArray(searchParams.password)
    ? searchParams.password[0]
    : searchParams.password
  try {
    const { note: res } = await getData({
      ...params,
      password,
      lang: searchParams.lang,
    })

    const { data } = res
    const description = getSummaryFromMd(data.text ?? '')

    const paramsIdStr = Array.isArray(params.id)
      ? params.id.join('/')
      : params.id

    const ogUrl = await getOgUrl(
      'note',
      {
        nid: paramsIdStr,
      },
      params.locale,
    )

    const canonicalPathNoLocale = `/notes/${paramsIdStr}`
    const canonicalPath = buildLocalePrefixedPath(
      params.locale as any,
      canonicalPathNoLocale,
    )
    const supportedLocales = getSupportedLocalesFromTranslations({
      sourceLang: (data as any).translationMeta?.sourceLang,
      availableTranslations: (data as any).availableTranslations,
    })

    return {
      title: data.title,
      description,
      openGraph: {
        title: data.title,
        description,
        images: ogUrl,
        type: 'article',
      },
      twitter: {
        images: ogUrl,
        title: data.title,
        description,
        card: 'summary_large_image',
      },
      alternates: {
        canonical: canonicalPath,
        languages: {
          ...buildLanguageAlternates(canonicalPathNoLocale, supportedLocales),
          'x-default': canonicalPathNoLocale,
        },
      },
    } satisfies Metadata
  } catch {
    return {}
  }
}

export default definePrerenderPage<NoteDetailPageParams>()<NoteDataResult>({
  fetcher: getData,
  requestErrorRenderer(_error, parsed, { id }) {
    const { status } = parsed

    // `id` can be a string (legacy nid) or a string array (catch-all).
    // `CurrentNoteNidProvider` expects a string, so coerce / pick the nid.
    const nidForProvider =
      typeof id === 'string' ? id : id.length === 1 ? id[0] : id.join('/')

    if (status === 403) {
      return (
        <Paper>
          <NotePasswordForm />
          <CurrentNoteNidProvider nid={nidForProvider} />
        </Paper>
      )
    }
  },
  async Component({ data: fetchedData, params: { id, locale }, fetchedAt }) {
    const { note: data } = fetchedData
    const t = await getTranslations({
      namespace: 'note',
      locale,
    })

    // Normalise the catch-all `id` for the nid provider; pass through the
    // joined form for new date+slug URLs so the key on Paper matches the URL.
    const nidKey = Array.isArray(id) ? id.join('/') : id

    return (
      <TocHeadingStrategyProvider
        contentFormat={data.data.contentFormat}
        hasContent={!!data.data.content}
      >
        <CurrentNoteNidProvider nid={nidKey} />
        <CurrentNoteDataProvider data={data} />
        <NoteDataReValidate fetchedAt={fetchedAt} />
        <SyncNoteDataAfterLoggedIn />
        <Transition className="min-w-0" lcpOptimization>
          <Paper key={nidKey} as={NoteMainContainer}>
            <PageInner
              data={data.data}
              privateLoginOnlyMessage={t('private_login_only')}
            />
          </Paper>
          <BottomToUpSoftScaleTransitionView delay={500}>
            <CommentAreaRootLazy
              refId={data.data.id}
              allowComment={data.data.allowComment}
            />
          </BottomToUpSoftScaleTransitionView>
        </Transition>

        <NoteFontSettingFab />

        <OnlyMobile>
          <TocFAB />
        </OnlyMobile>
      </TocHeadingStrategyProvider>
    )
  },
})
