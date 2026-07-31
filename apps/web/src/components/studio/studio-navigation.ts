export const studioSections = [
  'overview',
  'materials',
  'media',
  'hotspots',
  'projects',
  'pages',
  'ai',
  'ops',
  'settings',
] as const

export type StudioSection = (typeof studioSections)[number]

const studioSectionSet = new Set<string>(studioSections)

export const readStudioSection = (search: string): StudioSection => {
  const section = new URLSearchParams(search).get('section')
  return section && studioSectionSet.has(section)
    ? (section as StudioSection)
    : 'overview'
}

export const studioSectionUrl = (
  section: StudioSection,
  href: string,
): string => {
  const url = new URL(href)
  if (section === 'overview') {
    url.searchParams.delete('section')
  } else {
    url.searchParams.set('section', section)
  }
  return `${url.pathname}${url.search}`
}
