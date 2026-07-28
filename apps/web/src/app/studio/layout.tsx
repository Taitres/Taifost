import type { Metadata } from 'next'
import type { PropsWithChildren } from 'react'

import { sansFont } from '~/lib/fonts'

export const metadata: Metadata = {
  title: 'MARLIN.LOG 内容工作室',
  robots: { index: false, follow: false },
}

export default function StudioLayout({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${sansFont.variable} m-0 min-h-screen font-sans`}>
        {children}
      </body>
    </html>
  )
}
