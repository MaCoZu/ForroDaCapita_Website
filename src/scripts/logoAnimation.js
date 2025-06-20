function logoFlicker({
  ids = [],
  minDelay = 0,
  maxDelay = 600,
  minDuration = 100,
  maxDuration = 400,
  repeat = 1,
  className = 'active',
} = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return
  ids.forEach((id) => {
    const el = document.getElementById(id)
    if (!el) return
    for (let r = 0; r < repeat; r++) {
      const delay =
        Math.random() * (maxDelay - minDelay) + minDelay + r * (maxDelay + 50)
      const duration = Math.random() * (maxDuration - minDuration) + minDuration
      setTimeout(() => {
        el.classList.add(className)
        setTimeout(() => el.classList.remove(className), duration)
      }, delay)
    }
  })
}
// Example usage (uncomment to auto-run):
document.addEventListener('DOMContentLoaded', () => {
  logoFlicker({
    ids: ['F', 'O', 'R1', 'R2', 'Ó', 'D', 'A1', 'C', 'A2', 'P', 'I', 'T', 'A3'],
    minDelay: 0, // ms, minimum delay before flicker
    maxDelay: 600, // ms, maximum delay before flicker
    minDuration: 100, // ms, minimum flicker duration
    maxDuration: 900, // ms, maximum flicker duration
    repeat: 5, // how many times to repeat the flicker per letter
    className: 'active',
  })
})
