import { test } from 'node:test'
import assert from 'node:assert/strict'
import { h, isReactive, nextTick, Teleport } from 'vue'
import { mountComponent } from './helpers/sfc-runtime.js'

test('host reorders keyed elements without duplicating nodes and keeps insertion anchors', async (t) => {
  const view = mountComponent(
    t,
    {
      props: ['items'],
      setup: (props) => () =>
        h('main', [...props.items.map((id) => h('p', { key: id }, id)), h('aside', 'end')]),
    },
    { props: { items: ['a', 'b', 'c'] } },
  )
  const originals = view.all((node) => node.type === 'p')
  view.props.items = ['c', 'a', 'd', 'b']
  await nextTick()
  const rows = view.all((node) => node.type === 'p')
  assert.deepEqual(
    rows.map((node) => node.text),
    ['c', 'a', 'd', 'b'],
  )
  assert.equal(rows[0], originals[2])
  assert.equal(rows[1], originals[0])
  assert.equal(rows[3], originals[1])
  assert.deepEqual(
    view.find((node) => node.type === 'main').children.map((node) => node.type),
    ['p', 'p', 'p', 'p', 'aside'],
  )
  view.props.items = ['d']
  await nextTick()
  assert.deepEqual(
    view.all((node) => node.type === 'p').map((node) => node.text),
    ['d'],
  )
  assert.equal(originals[0].parent, null)
})

test('host replaces element children with text and detaches the previous children', async (t) => {
  const view = mountComponent(
    t,
    {
      props: ['asText'],
      setup: (props) => () => h('main', props.asText ? 'replacement' : [h('p', 'old')]),
    },
    { props: { asText: false } },
  )
  const old = view.find((node) => node.type === 'p')
  assert.equal(isReactive(old), false)
  view.props.asText = true
  await nextTick()
  assert.equal(view.text(), ' replacement')
  assert.equal(
    view.find((node) => node.type === 'p'),
    undefined,
  )
  assert.equal(old.parent, null)
  view.props.asText = false
  await nextTick()
  assert.equal(view.find((node) => node.type === 'main').text, '')
  assert.equal(view.find((node) => node.type === 'p').text, 'old')
  view.unmount()
  view.unmount()
  assert.equal(view.root.children.length, 0)
})

test('host moves existing nodes between Teleport targets without leaving stale children', async (t) => {
  const view = mountComponent(
    t,
    {
      props: ['target'],
      setup: (props) => () =>
        h('main', [
          h('section', { id: 'first' }),
          h('section', { id: 'second' }),
          props.target ? h(Teleport, { to: props.target }, [h('p', 'moving')]) : null,
        ]),
    },
    { props: { target: null } },
  )
  const first = view.find((node) => node.props.id === 'first')
  const second = view.find((node) => node.props.id === 'second')
  view.props.target = first
  await nextTick()
  const moving = view.find((node) => node.type === 'p')
  assert.equal(moving.parent, first)
  view.props.target = second
  await nextTick()
  assert.equal(moving.parent, second)
  assert.equal(first.children.includes(moving), false)
  assert.equal(second.children.filter((node) => node === moving).length, 1)
  assert.equal(view.all((node) => node.type === 'p').length, 1)
})

test('host finds the next sibling when replacing a component fragment', async (t) => {
  const child = {
    setup: () => () => [h('i', 'first'), h('i', 'second')],
  }
  const view = mountComponent(
    t,
    {
      props: ['replace'],
      setup: (props) => () =>
        h('main', [props.replace ? h('b', 'new') : h(child), h('aside', 'end')]),
    },
    { props: { replace: false } },
  )
  view.props.replace = true
  await nextTick()
  assert.deepEqual(
    view.find((node) => node.type === 'main').children.map((node) => node.type),
    ['b', 'aside'],
  )
  assert.equal(view.all((node) => node.type === 'i').length, 0)
})
