import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

import { MarkdownClient } from './client'

const fallbackMarkdown = `# Markdown 渲染检查

这个页面用于检查 Shiro 的 Markdown 渲染管线。服务器存在
\`~/test-text.md\` 时会显示该文件，否则显示这份内置示例。

| 能力 | 状态 |
| --- | --- |
| GFM 表格 | 正常 |
| 代码块 | 正常 |
| KaTeX | $E = mc^2$ |

\`\`\`ts
const renderer = 'Shiro'
\`\`\`
`

export default function Page() {
  let text = fallbackMarkdown
  try {
    text = readFileSync(resolve(homedir(), 'test-text.md'), 'utf-8')
  } catch {
    // The local fixture is optional and is intentionally absent in production.
  }
  return (
    <div className="prose mx-auto w-[65ch]">
      <MarkdownClient>{text}</MarkdownClient>
    </div>
  )
}
