import assert from 'node:assert/strict'
import test from 'node:test'

import { stripUnsupportedHighlightRules } from './patch-rich-kit-css.mjs'

const activeRule =
  '::highlight(rich-editor-text-selection){background-color:var(--rc-accent-light);color:inherit}'
const inactiveRule =
  '::highlight(rich-editor-text-selection-inactive){background-color:color-mix(in srgb,var(--rc-text-tertiary) 24%,transparent);color:inherit}'

test('removes the two unsupported generated highlight rules', () => {
  const result = stripUnsupportedHighlightRules(
    `.before{color:red}${activeRule}${inactiveRule}.after{color:blue}`,
  )

  assert.equal(result.changed, true)
  assert.equal(result.source, '.before{color:red}.after{color:blue}')
})

test('is idempotent once the compatibility patch is applied', () => {
  const source = '.selection::selection{background:var(--rc-accent-light)}'

  assert.deepEqual(stripUnsupportedHighlightRules(source), {
    changed: false,
    source,
  })
})

test('fails closed when the dependency changes its generated CSS', () => {
  assert.throws(
    () =>
      stripUnsupportedHighlightRules(
        '::highlight(rich-editor-text-selection){background:red}',
      ),
    /Unexpected rich-kit highlight CSS/,
  )
})
