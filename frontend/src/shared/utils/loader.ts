// src/utils/loader.ts
const ID = 'global-loader'
const STYLE_ID = 'global-loader-style'

let refCount = 0

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes global-loader-spin {
      to { transform: rotate(360deg); }
    }
    .global-loader-spinner {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.25);
      border-top-color: #fff;
      animation: global-loader-spin 0.7s linear infinite;
    }
  `
  document.head.appendChild(style)
}

function ensureLoaderEl(): HTMLElement {
  let el = document.getElementById(ID)
  if (el) return el

  ensureStyles()

  el = document.createElement('div')
  el.id = ID
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: '9999',
  })

  const spinner = document.createElement('div')
  spinner.className = 'global-loader-spinner'
  spinner.setAttribute('role', 'status')
  spinner.setAttribute('aria-label', 'Cargando')
  el.appendChild(spinner)
  document.body.appendChild(el)

  return el
}

export function loader(show: boolean): void {
  const el = ensureLoaderEl()
  refCount = Math.max(0, refCount + (show ? 1 : -1))
  el.style.display = refCount > 0 ? 'flex' : 'none'
}
