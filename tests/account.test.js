import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#imports':
        'export const definePageMeta = (meta) => { globalThis.accountMocks.pageMeta = meta }; export const navigateTo = (to) => globalThis.accountMocks.navigations.push(to); export const useRoute = () => globalThis.accountMocks.route',
      '~/stores/auth': 'export const useAuthStore = () => globalThis.accountMocks.auth',
    }
    if (mocks[specifier])
      return { url: `data:text/javascript,${mocks[specifier]}`, shortCircuit: true }
    if (specifier.endsWith('.svg'))
      return { url: 'data:text/javascript,export default {render:()=>null}', shortCircuit: true }
    return nextResolve(
      specifier,
      context.parentURL?.startsWith('data:') ? { ...context, parentURL: import.meta.url } : context,
    )
  },
})

const components = {}
for (const name of ['BaseInput', 'BaseButton', 'AccountForm', 'AccountPanel', 'AccountTabs']) {
  components[name] = await loadSfc(new URL(`../components/${name}.vue`, import.meta.url))
}
components.NuxtLink = {
  props: ['to'],
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: props.to }, slots.default?.()),
}
const account = await loadSfc(new URL('../pages/account.vue', import.meta.url))
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  await nextTick()
}

function deferred() {
  let resolve, reject
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

function setup(t, query = {}) {
  const calls = []
  const mocks = {
    navigations: [],
    route: { query },
    auth: {
      login: (...args) => {
        calls.push(args)
        return Promise.resolve(true)
      },
    },
  }
  globalThis.accountMocks = mocks
  globalThis.Document = class Document {}
  t.after(() => {
    delete globalThis.accountMocks
    delete globalThis.Document
  })
  let focused
  const view = mountComponent(t, account, {
    components,
    decorateNode(element) {
      element.addEventListener = () => {}
      element.getRootNode = () => new globalThis.Document()
      element.focus = () => {
        focused = element
      }
    },
  })
  const field = (name) => view.find((node) => node.type === 'input' && node.props.name === name)
  const input = async (name, value) => {
    field(name).props['onUpdate:modelValue'](value)
    await nextTick()
  }
  const submit = async () => {
    view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
    await settle()
  }
  const button = (label) =>
    view.find(
      (node) => node.type === 'button' && node.children.some((child) => child.text === label),
    )
  const selectTab = async (label) => {
    button(label).props.onClick()
    await nextTick()
    assert.equal(button(label).props['aria-pressed'], true)
  }
  const submitButton = () =>
    view.find((node) => node.type === 'button' && node.props.type === 'submit')
  const fillCredentials = async () => {
    await input('username', 'user')
    await input('password', 'secret')
  }
  const pendingLogin = () => {
    const pending = deferred()
    mocks.auth.login = (...args) => {
      calls.push(args)
      return pending.promise
    }
    return pending
  }
  return {
    ...view,
    mocks,
    calls,
    field,
    input,
    submit,
    selectTab,
    submitButton,
    fillCredentials,
    pendingLogin,
    focused: () => focused,
  }
}

test('account declares the guest route middleware', (t) => {
  const view = setup(t)
  assert.deepEqual(view.mocks.pageMeta, { middleware: 'guest' })
})

test('sign in fields keep accessible names when placeholder hints are replaced by input', async (t) => {
  const view = setup(t)

  for (const [name, label] of [
    ['username', 'Username'],
    ['password', 'Password'],
  ]) {
    assert.equal(view.field(name).props.placeholder, label)
    assert.equal(view.field(name).props['aria-label'], label)
    await view.input(name, 'entered value')
    assert.equal(view.field(name).value, 'entered value')
    assert.equal(view.field(name).props['aria-label'], label)
  }

  assert.equal(
    view.find((node) => node.type === 'label' && node.props.for?.startsWith('account-')),
    undefined,
  )
  assert.ok(view.find((node) => node.type === 'a' && node.props.href === '/reset-password'))
})

test('Remember me defaults off and snapshots the selected choice for each submission', async (t) => {
  const view = setup(t)
  const checkbox = () => view.field('remember-me')
  assert.equal(checkbox().props.type, 'checkbox')
  assert.equal(checkbox().checked, false)
  assert.match(
    checkbox()
      .parent.children.map((node) => node.text)
      .join(' '),
    /Remember me/,
  )

  await view.fillCredentials()
  let pending = view.pendingLogin()
  await view.submit()
  assert.equal(view.calls[0][3], false)
  checkbox().props['onUpdate:modelValue'](true)
  await nextTick()
  assert.equal(view.calls[0][3], false)
  pending.reject({ statusCode: 401 })
  await settle()

  pending = view.pendingLogin()
  await view.submit()
  assert.equal(view.calls[1][3], true)
  pending.resolve(true)
  await settle()
})

test('Username clear empties the input, restores focus and preserves validation without submitting', async (t) => {
  const view = setup(t)
  const clear = () => view.find((node) => node.props['aria-label'] === 'Clear Username')
  assert.equal(clear(), undefined)
  await view.fillCredentials()
  assert.equal(clear().props.type, 'button')
  assert.equal(view.all((node) => node.props['aria-label']?.startsWith('Clear ')).length, 1)
  clear().props.onClick()
  await nextTick()
  assert.equal(view.field('username').value, '')
  assert.equal(view.field('username').props.placeholder, 'Username')
  assert.equal(view.focused(), view.field('username'))
  assert.equal(clear(), undefined)
  assert.equal(view.calls.length, 0)
  await view.submit()
  assert.equal(view.calls.length, 0)
  assert.equal(view.field('username').props['aria-invalid'], true)
  assert.equal(view.focused(), view.field('username'))
  await view.input('username', 'new user')
  assert.ok(clear())
})

test('sign in validates first invalid input and submits trimmed username with unchanged password', async (t) => {
  const view = setup(t)
  assert.equal(view.field('username').props.autocomplete, 'username')
  assert.equal(view.field('password').props.type, 'password')
  assert.equal(view.field('password').props.autocomplete, 'current-password')
  await view.submit()
  assert.equal(view.calls.length, 0)
  assert.equal(view.focused(), view.field('username'))
  assert.equal(view.field('username').props['aria-invalid'], true)
  const errorId = view.field('username').props['aria-describedby']
  assert.match(view.find((node) => node.props.id === errorId).text, /Enter your username/)
  await view.input('username', '  user  ')
  await view.input('password', '  ')
  await view.submit()
  assert.equal(view.calls.length, 0)
  assert.equal(view.focused(), view.field('password'))
  await view.input('password', ' p ')
  await view.submit()
  assert.deepEqual(view.calls[0].slice(0, 2), ['user', ' p '])
  assert.deepEqual(view.mocks.navigations, ['/'])
})

test('sign-in return target accepts only the exact checkout route', async (t) => {
  for (const [returnTo, destination] of [
    ['/checkout', '/checkout'],
    ['//other.example', '/'],
    [['/checkout', '//other.example'], '/'],
  ]) {
    await t.test(JSON.stringify(returnTo), async (subtest) => {
      const view = setup(subtest, { returnTo })
      await view.fillCredentials()
      await view.submit()
      assert.deepEqual(view.mocks.navigations, [destination])
    })
  }
})

test('pending submit is disabled; failures preserve input and show helpful inline errors', async (t) => {
  const view = setup(t)
  let pending = view.pendingLogin()
  await view.fillCredentials()
  await view.submit()
  assert.equal(view.submitButton().props.disabled, true)
  assert.match(view.text(), /Signing in/)
  await view.submit()
  assert.equal(view.calls.length, 1)
  pending.reject({ statusCode: 401 })
  await settle()
  assert.match(
    view.find((node) => node.props.role === 'alert').text,
    /Incorrect username or password/,
  )
  assert.equal(view.field('password').value, 'secret')
  assert.deepEqual(view.mocks.navigations, [])
  pending = view.pendingLogin()
  await view.submit()
  pending.reject(new Error('offline'))
  await settle()
  assert.match(
    view.find((node) => node.props.role === 'alert').text,
    /Unable to sign in. Please try again/,
  )
})

test('login errors prefer statusCode and preserve status fallback messages', async (t) => {
  const view = setup(t)
  await view.fillCredentials()

  for (const [error, message] of [
    [{ statusCode: 400, status: 500 }, /Incorrect username or password/],
    [{ statusCode: 403 }, /Incorrect username or password/],
    [{ status: 401 }, /Incorrect username or password/],
    [{ statusCode: 500, status: 401 }, /Unable to sign in/],
  ]) {
    const pending = view.pendingLogin()
    await view.submit()
    pending.reject(error)
    await settle()
    assert.match(view.find((node) => node.props.role === 'alert').text, message)
  }
})

test('switching tabs aborts login; stale completion leaves the next request loading', async (t) => {
  const view = setup(t)
  const oldLogin = view.pendingLogin()
  await view.fillCredentials()
  await view.submit()
  const oldSignal = view.calls[0][2]
  await view.selectTab('Register')
  assert.equal(oldSignal.aborted, true)
  assert.match(view.text(), /Registration is currently unavailable/)
  assert.equal(
    view.find((node) => node.type === 'form'),
    undefined,
  )
  await view.selectTab('Sign in')
  assert.equal(view.submitButton().props.disabled, false)
  const newLogin = view.pendingLogin()
  await view.submit()
  oldLogin.resolve(false)
  await settle()
  assert.equal(view.submitButton().props.disabled, true)
  assert.match(view.text(), /Signing in/)
  assert.equal(
    view.find((node) => node.props.role === 'alert'),
    undefined,
  )
  assert.deepEqual(view.mocks.navigations, [])
  newLogin.resolve(true)
  await settle()
  assert.equal(view.submitButton().props.disabled, false)
  assert.deepEqual(view.mocks.navigations, ['/'])
})

test('unmount aborts pending login and prevents stale redirect', async (t) => {
  const view = setup(t)
  const pending = view.pendingLogin()
  await view.fillCredentials()
  await view.submit()
  view.unmount()
  assert.equal(view.calls[0][2].aborted, true)
  pending.resolve(true)
  await settle()
  assert.deepEqual(view.mocks.navigations, [])
})

test('a false login result clears loading without navigating or showing an error', async (t) => {
  const view = setup(t)
  const pending = view.pendingLogin()
  await view.fillCredentials()
  await view.submit()
  pending.resolve(false)
  await settle()

  assert.equal(view.submitButton().props.disabled, false)
  assert.deepEqual(view.mocks.navigations, [])
  assert.equal(
    view.find((node) => node.props.role === 'alert'),
    undefined,
  )
})

test('a stale rejected login cannot replace the newer request error', async (t) => {
  const view = setup(t)
  const stale = view.pendingLogin()
  await view.fillCredentials()
  await view.submit()
  await view.selectTab('Register')
  await view.selectTab('Sign in')
  const current = view.pendingLogin()
  await view.submit()
  current.reject({ statusCode: 401 })
  await settle()
  stale.reject(new Error('Late network failure'))
  await settle()

  assert.match(
    view.find((node) => node.props.role === 'alert').text,
    /Incorrect username or password/,
  )
  assert.equal(view.submitButton().props.disabled, false)
  assert.deepEqual(view.mocks.navigations, [])
})
