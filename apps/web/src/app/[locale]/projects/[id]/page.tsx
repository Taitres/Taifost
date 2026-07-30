'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

import { NotFound404 } from '~/components/common/404'
import { ProjectIcon } from '~/components/modules/project/ProjectIcon'
import { Loading } from '~/components/ui/loading'
import { apiClient } from '~/lib/request'

export default function Page() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: [id, 'project'],
    queryFn: async ({ queryKey }) => {
      const [id] = queryKey
      return apiClient.project.getById(id as string)
    },
  })

  if (isLoading) {
    return <Loading useDefaultLoadingText />
  }

  if (!data) {
    return <NotFound404 />
  }

  const links = [
    { label: '访问项目', href: data.projectUrl },
    { label: '在线预览', href: data.previewUrl },
    { label: '查看文档', href: data.docUrl },
  ].filter(
    (item, index, items): item is { label: string; href: string } =>
      Boolean(item.href) &&
      items.findIndex(({ href }) => href === item.href) === index,
  )

  return (
    <article className="mx-auto mt-12 w-full max-w-3xl">
      <header className="flex items-center gap-6">
        <ProjectIcon
          avatar={data.avatar}
          name={data.name}
          className="size-20"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold">{data.name}</h1>
          {data.description && (
            <p className="mt-2 text-base-content/70">{data.description}</p>
          )}
        </div>
      </header>

      {data.text && (
        <p className="mt-10 whitespace-pre-wrap leading-7">{data.text}</p>
      )}

      {links.length > 0 && (
        <nav className="mt-10 flex flex-wrap gap-3" aria-label="项目链接">
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-base-content/20 px-5 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </article>
  )
}
