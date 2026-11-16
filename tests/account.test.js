import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { h, nextTick, reactive } from 'vue'
import { loadSfc, mountComponent } from './helpers/sfc-runtime.js'

registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks = {
      '#imports':
        'export const definePageMeta = (meta) => { globalThis.accountMocks.pageMeta = meta }; export const navigateTo = (to) => globalThis.accountMocks.navigations.push(to); export const useRoute = () => ({path:"/account"})',
      '~/stores/auth': 'export const useAuthStore = () => globalThis.accountMocks.auth',
      '~/stores/cartStore': 'export const useCartStore = () => globalThis.accountMocks.cart',
      '~/composables/useNotification':
        'export const useNotification = () => ({showNotification: (payload) => globalThis.accountMocks.notifications.push(payload)})',
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
const resetPassword = await loadSfc(new URL('../pages/reset-password.vue', import.meta.url))
const header = await loadSfc(new URL('../components/BaseHeader.vue', import.meta.url))
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

function setup(t, component = account) {
  const calls = []
  const mocks = {
    navigations: [],
    notifications: [],
    cart: { toggleSidebar() {} },
    auth: reactive({
      user: null,
      get isAuthenticated() {
        return Boolean(this.user)
      },
      login: (...args) => {
        calls.push(args)
        return Promise.resolve()
      },
      logout() {
        this.user = null
      },
    }),
  }
  globalThis.accountMocks = mocks
  globalThis.Document = class Document {}
  t.after(() => {
    delete globalThis.accountMocks
    delete globalThis.Document
  })
  let focused
  const view = mountComponent(t, component, {
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

test('only account declares the guest route middleware', (t) => {
  const accountView = setup(t)
  assert.deepEqual(accountView.mocks.pageMeta, { middleware: 'guest' })
  const resetView = setup(t, resetPassword)
  assert.equal(resetView.mocks.pageMeta, undefined)
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
  pending.resolve()
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
  oldLogin.resolve()
  await settle()
  assert.equal(view.submitButton().props.disabled, true)
  assert.match(view.text(), /Signing in/)
  assert.equal(
    view.find((node) => node.props.role === 'alert'),
    undefined,
  )
  assert.deepEqual(view.mocks.navigations, [])
  newLogin.resolve()
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
  pending.resolve()
  await settle()
  assert.deepEqual(view.mocks.navigations, [])
})

test('reset validates email, notifies without navigation and retains entered email', async (t) => {
  const view = setup(t, resetPassword)
  assert.equal(view.field('email').props.placeholder, 'Email')
  assert.equal(view.field('email').props['aria-label'], 'Email')
  assert.equal(view.field('email').props.type, 'email')
  assert.equal(view.field('email').props.autocomplete, 'email')
  await view.input('email', 'invalid')
  await view.submit()
  assert.equal(view.focused(), view.field('email'))
  assert.deepEqual(view.mocks.notifications, [])
  await view.input('email', ' user@example.com ')
  await view.submit()
  assert.deepEqual(view.mocks.notifications, [{ message: 'Отправили пароль на email' }])
  assert.equal(view.field('email').value, ' user@example.com ')
  assert.deepEqual(view.mocks.navigations, [])
  assert.ok(view.find((node) => node.type === 'a' && node.props.href === '/account'))
})

test('desktop account action navigates for guest, logs out in place with indicator, then navigates again', async (t) => {
  const view = setup(t, header)
  const action = () =>
    view.find(
      (node) =>
        node.type === 'button' && ['My account', 'Log out'].includes(node.props['aria-label']),
    )
  action().props.onClick()
  assert.deepEqual(view.mocks.navigations, ['/account'])
  view.mocks.auth.user = 'token'
  await nextTick()
  assert.equal(action().props['aria-label'], 'Log out')
  assert.ok(view.find((node) => node.props.class === 'page-header__account-indicator'))
  action().props.onClick()
  await nextTick()
  assert.equal(view.mocks.auth.user, null)
  assert.deepEqual(view.mocks.navigations, ['/account'])
  assert.deepEqual(view.mocks.notifications, [{ message: 'Вы вышли из аккаунта' }])
  action().props.onClick()
  assert.deepEqual(view.mocks.navigations, ['/account', '/account'])
  assert.ok(view.find((node) => node.type === 'a' && node.props.href === '/#'))
})
