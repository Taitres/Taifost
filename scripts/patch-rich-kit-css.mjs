import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const EXPECTED_PACKAGE_VERSION = '0.0.105'

const unsupportedRules = [
  '::highlight(rich-editor-text-selection){background-color:var(--rc-accent-light);color:inherit}',
  '::highlight(rich-editor-text-selection-inactive){background-color:color-mix(in srgb,var(--rc-text-tertiary) 24%,transparent);color:inherit}',
]

export function stripUnsupportedHighlightRules(source) {
  const selectorCount =
    source.match(/::highlight\(rich-editor-text-selection(?:-inactive)?\)/g)
      ?.length ?? 0

  if (selectorCount === 0) {
    return { changed: false, source }
  }

  const exactRuleCount = unsupportedRules.reduce(
    (count, rule) => count + source.split(rule).length - 1,
    0,
  )

  if (
    selectorCount !== unsupportedRules.length ||
    exactRuleCount !== selectorCount
  ) {
    throw new Error(
      `Unexpected rich-kit highlight CSS: found ${selectorCount} selectors but ${exactRuleCount} known rules`,
    )
  }

  return {
    changed: true,
    source: unsupportedRules.reduce(
      (result, rule) => result.replace(rule, ''),
      source,
    ),
  }
}

async function findInstalledPackages(workspaceRoot, packageName) {
  const virtualStore = join(workspaceRoot, 'node_modules/.pnpm')
  const packagePrefix = `${packageName.replace('/', '+')}@${EXPECTED_PACKAGE_VERSION}`
  const entries = (await readdir(virtualStore, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === packagePrefix ||
          entry.name.startsWith(`${packagePrefix}_`)),
    )
    .map((entry) => join(virtualStore, entry.name, 'node_modules', packageName))

  if (entries.length === 0) {
    throw new Error(
      `Could not find ${packageName} ${EXPECTED_PACKAGE_VERSION} in the pnpm virtual store`,
    )
  }

  for (const packageRoot of entries) {
    const packageJson = JSON.parse(
      await readFile(join(packageRoot, 'package.json'), 'utf8'),
    )

    if (packageJson.name !== packageName) {
      throw new Error(`Expected ${packageName}, received ${packageJson.name}`)
    }
    if (packageJson.version !== EXPECTED_PACKAGE_VERSION) {
      throw new Error(
        `Expected ${packageName} ${EXPECTED_PACKAGE_VERSION}, received ${packageJson.version}`,
      )
    }
  }

  return entries
}

async function patchStyleFile(stylePath, packageName) {
  const original = await readFile(stylePath, 'utf8')
  const patched = stripUnsupportedHighlightRules(original)

  if (patched.changed) {
    await writeFile(stylePath, patched.source)
    console.info(
      `Patched unsupported CSS highlight rules in ${packageName} ${EXPECTED_PACKAGE_VERSION}`,
    )
  } else {
    console.info(
      `CSS compatibility patch already applied for ${packageName} ${EXPECTED_PACKAGE_VERSION}`,
    )
  }
}

export async function patchInstalledRichStyles() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url))
  const workspaceRoot = resolve(scriptDirectory, '..')
  const richKitRoots = await findInstalledPackages(
    workspaceRoot,
    '@haklex/rich-kit-shiro',
  )
  const richEditorRoots = await findInstalledPackages(
    workspaceRoot,
    '@haklex/rich-editor',
  )

  for (const richKitRoot of richKitRoots) {
    const distDirectory = join(richKitRoot, 'dist')
    const styleFiles = (await readdir(distDirectory)).filter((file) =>
      /^style-[\w-]+\.js$/.test(file),
    )

    if (styleFiles.length !== 1) {
      throw new Error(
        `Expected one generated rich-kit style module, received ${styleFiles.length}`,
      )
    }

    await patchStyleFile(
      join(distDirectory, styleFiles[0]),
      '@haklex/rich-kit-shiro',
    )
  }

  for (const richEditorRoot of richEditorRoots) {
    await patchStyleFile(
      join(richEditorRoot, 'dist/rich-editor.css'),
      '@haklex/rich-editor',
    )
  }
}

const isDirectInvocation =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirectInvocation) {
  await patchInstalledRichStyles()
}
