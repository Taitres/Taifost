'use client'

import { ClientOnly } from '~/components/common/ClientOnly'
import { Markdown } from '~/components/ui/markdown/Markdown'

export const MarkdownClient = (props: { children: string }) => {
  return (
    <ClientOnly>
      <Markdown>{props.children}</Markdown>
    </ClientOnly>
  )
}
