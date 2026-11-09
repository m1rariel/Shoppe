import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h, markRaw, reactive } from 'vue'

// Scenario-specific import resolution belongs to each suite. Only the language loader is shared.
registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
      return {
        format: 'module',
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' }),
        shortCircuit: true,
      }
    }
    return nextLoad(url, context)
  },
})

export async function loadSfc(url, { transformSource = (source) => source } = {}) {
  const { descriptor } = parse(transformSource(readFileSync(url, 'utf8')), {
    filename: url.pathname,
  })
  const compiled = compileScript(descriptor, {
    id: url.pathname,
    inlineTemplate: true,
    // Static HTML insertion requires a browser DOM. Render each node through the host instead.
    templateOptions: { compilerOptions: { hoistStatic: false } },
  })
  const source = stripTypeScriptTypes(compiled.content, { mode: 'transform' })
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`))
    .default
}

export function observeTree(root) {
  const walk = (node) => [node, ...node.children.flatMap(walk)]
  const all = (predicate = () => true) => walk(root).filter(predicate)
  return {
    find: (predicate) => all().find(predicate),
    all,
    text: () =>
      all()
        .map((node) => node.text)
        .join(' '),
  }
}

// This is a Vue host tree, not a browser DOM. Suites explicitly supply any browser adapters.
export function mountComponent(
  t,
  component,
  { props: initial = {}, components = {}, decorateNode } = {},
) {
  const node = (type, text = '') => {
    const element = markRaw({ type, text, props: {}, style: {}, children: [], parent: null })
    decorateNode?.(element)
    return element
  }
  const detach = (child) => {
    if (!child.parent) return
    const index = child.parent.children.indexOf(child)
    if (index < 0) throw new Error('Host node is missing from its parent')
    child.parent.children.splice(index, 1)
    child.parent = null
  }
  const renderer = createRenderer({
    createElement: (type) => node(type),
    createText: (text) => node('text', text),
    createComment: (text) => node('comment', text),
    insert(child, parent, anchor = null) {
      if (anchor === child) return
      detach(child)
      const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
      if (index < 0) throw new Error('Host insertion anchor is missing from its parent')
      parent.text = ''
      parent.children.splice(index, 0, child)
      child.parent = parent
    },
    remove: detach,
    setElementText(element, text) {
      for (const child of element.children) child.parent = null
      element.children = []
      element.text = text
    },
    setText(element, text) {
      element.text = text
    },
    patchProp(element, key, previous, next) {
      element.props[key] = next
    },
    parentNode: (element) => element.parent,
    nextSibling(element) {
      const siblings = element.parent?.children
      return siblings?.[siblings.indexOf(element) + 1] ?? null
    },
  })
  const props = reactive(initial)
  const root = node('root')
  const app = renderer.createApp({ setup: () => () => h(component, props) })
  for (const [name, adapter] of Object.entries(components)) app.component(name, adapter)
  let mounted = false
  const unmount = () => {
    if (!mounted) return
    app.unmount()
    mounted = false
  }
  t.after(unmount)
  app.mount(root)
  mounted = true
  return { root, props, unmount, ...observeTree(root) }
}
