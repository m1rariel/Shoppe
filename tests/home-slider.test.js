import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { readFileSync } from 'node:fs'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { createRenderer, h, markRaw, nextTick, ref, Suspense } from 'vue'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/composables/useGetRandomPhotos')
      return {
        url: 'data:text/javascript,export async function useGetRandomPhotos(limit){globalThis.heroTest.limit=limit;return {data:globalThis.heroTest.photos}}',
        shortCircuit: true,
      }
    if (
      specifier === 'swiper/css' ||
      specifier.endsWith('/pagination') ||
      specifier.endsWith('/navigation')
    )
      return { url: 'data:text/javascript,export default {}', shortCircuit: true }
    if (specifier === 'swiper/modules')
      return {
        url: 'data:text/javascript,export const Navigation={};export const Pagination={}',
        shortCircuit: true,
      }
    if (specifier === 'swiper')
      return {
        url: 'data:text/javascript,export default class Swiper { constructor(el,options){this.el=el;this.options=options;globalThis.heroTest.sliders.push(this)} update(){this.updates=(this.updates??0)+1} }',
        shortCircuit: true,
      }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})
async function load(name) {
  const { descriptor } = parse(
    readFileSync(new URL(`../components/${name}.vue`, import.meta.url), 'utf8'),
  )
  if (!descriptor.script && !descriptor.scriptSetup) {
    const { code } = compileTemplate({
      source: descriptor.template.content,
      filename: name,
      id: name,
    })
    const { render } = await import(
      `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    )
    return { render }
  }
  const { content } = compileScript(descriptor, {
    id: name,
    inlineTemplate: true,
    templateOptions: { compilerOptions: { hoistStatic: false } },
  })
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(content, { mode: 'transform' })).toString('base64')}`
    )
  ).default
}
const [hero, textBlock] = await Promise.all([load('HomeSlider'), load('TextBlockSlider')])
const node = (type, text = '') => markRaw({ type, text, props: {}, style: {}, children: [] })
const renderer = createRenderer({
  createElement: (type) => node(type),
  createText: (text) => node('text', text),
  createComment: (text) => node('comment', text),
  insert(child, parent) {
    child.parent = parent
    parent.children.push(child)
  },
  remove(child) {
    child.parent.children.splice(child.parent.children.indexOf(child), 1)
  },
  setElementText(el, text) {
    el.text = text
  },
  setText(el, text) {
    el.text = text
  },
  patchProp(el, key, prev, next) {
    el.props[key] = next
  },
  parentNode: (el) => el.parent,
  nextSibling: () => null,
})
const walk = (el) => [el, ...el.children.flatMap(walk)]
async function setup(t, photos = []) {
  globalThis.heroTest = { sliders: [], photos: ref(photos) }
  const root = node('root')
  const app = renderer.createApp({
    setup: () => () => h(Suspense, null, { default: () => h(hero) }),
  })
  app.component('TextBlockSlider', textBlock)
  app.mount(root)
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
  t.after(() => {
    app.unmount()
    delete globalThis.heroTest
  })
  return { find: (fn) => walk(root).find(fn), all: (fn) => walk(root).filter(fn) }
}
const photos = Array.from({ length: 10 }, (_, id) => ({ download_url: `/photo-${id}.jpg` }))

test('hero requests ten photos and renders the original product text on each slide', async (t) => {
  const view = await setup(t, photos)
  assert.equal(globalThis.heroTest.limit, 10)
  assert.deepEqual(
    view.all((n) => n.type === 'img').map((n) => n.props.src),
    photos.map((photo) => photo.download_url),
  )
  assert.equal(view.all((n) => n.text === 'Gold big hoops').length, 10)
  assert.equal(view.all((n) => n.type === 'button' && n.text === 'View Product').length, 10)
  assert.equal(view.all((n) => n.type === 'p' && n.text.includes('68,00')).length, 10)
  const slider = globalThis.heroTest.sliders[0]
  assert.equal(slider.el, '.swiper')
  assert.equal(slider.options.loop, true)
  assert.equal(slider.options.slidesPerView, 1)
  assert.equal(slider.options.pagination.el, '.swiper-pagination')
  assert.equal(slider.options.pagination.clickable, true)
})

test('hero handles no photos and updates the slider when photos arrive', async (t) => {
  const view = await setup(t)
  assert.equal(view.all((n) => n.type === 'img').length, 0)
  const slider = globalThis.heroTest.sliders[0]
  globalThis.heroTest.photos.value = photos
  await nextTick()
  await nextTick()
  assert.equal(view.all((n) => n.type === 'img').length, 10)
  assert.equal(slider.updates, 1)
})
