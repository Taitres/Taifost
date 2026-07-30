'use client'

import dynamic from 'next/dynamic'

import { Loading } from '~/components/ui/loading'

const ThinkingPage = dynamic(() => import('./client'), {
  ssr: false,
  loading: () => <Loading useDefaultLoadingText />,
})

export default ThinkingPage
