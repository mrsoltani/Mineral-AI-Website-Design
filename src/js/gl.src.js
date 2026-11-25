import { mountScene } from './scene.src.js';
const rtl = document.documentElement.dir === 'rtl';
let how = null;
document.querySelectorAll('canvas[data-gl]').forEach((cv) => {
  let labels = null; try { labels = JSON.parse(cv.dataset.labels || 'null'); } catch (e) {}
  let api = null;
  try { api = mountScene(cv, { mode: cv.dataset.gl, rtl, labels }); } catch (e) { api = null; }
  if (!api) { cv.remove(); return; }
  document.documentElement.classList.add('gl');
  const fb = cv.parentElement.querySelector('canvas[data-geo]');
  if (fb) { if (fb._stop) fb._stop(); fb.style.display = 'none'; }
  cv.classList.add('ready');
  if (cv.dataset.gl === 'how') { how = api; window.__how = api; }
});
if (how) {
  const steps = [].slice.call(document.querySelectorAll('[data-stage]'));
  let cur = -1;
  const upd = () => {
    const mid = innerHeight / 2; let best = 0, bd = 1e9;
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
    // قبل از رسیدن به بخش، گام اول؛ بعد از آن، نزدیک‌ترین گام به مرکز صفحه
    const hs = document.querySelector('.how-steps');
    if (hs && steps.length) { const a = steps[0].getBoundingClientRect(), b = steps[steps.length - 1].getBoundingClientRect(); hs.style.setProperty('--hp', Math.max(0, Math.min(1, (mid - a.top) / Math.max(1, b.bottom - a.top))).toFixed(3)); }
    if (best !== cur) { cur = best; steps.forEach((s, i) => s.classList.toggle('is-active', i === best)); how.setStage(best); }
  };
  upd(); addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd);
}
import { mountModels } from './models.src.js';
mountModels();
