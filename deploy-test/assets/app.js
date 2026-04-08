function setText(id, value) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = value
}

async function loadHealth() {
  try {
    const res = await fetch('./health.txt', { cache: 'no-store' })
    const text = await res.text()
    setText('health', text.trim() ? text : '(empty)')
  } catch (err) {
    setText('health', `请求失败：${String(err)}`)
  }
}

function boot() {
  setText('hostname', window.location.hostname || '-')
  setText('pathname', window.location.pathname || '-')
  setText('clientTime', new Date().toISOString())
  loadHealth()
}

boot()
