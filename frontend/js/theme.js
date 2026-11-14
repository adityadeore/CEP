/* Rural Connect — Theme switcher + subtle cursor-reactive depth (UI only).
   - Sets data-theme on <html> and adds a small palette button.
   - Drives --mx / --my (smoothed pointer position) for gentle parallax in theme.css.
   - Never changes the cursor, content, API calls or any other script. */
(function () {
  var THEMES = [
    { id: 'ocean', group: 'Rural classics', name: 'Ocean Blue', hint: 'Blue · white · black (default)', sw: 'linear-gradient(135deg,#05080d 0%,#0a5fa8 55%,#2ec5e8 100%)' },
    { id: 'paddy', group: 'Rural classics', name: 'Paddy Field', hint: 'Fresh crop green', sw: 'linear-gradient(135deg,#040a06 0%,#15803d 55%,#a3e635 100%)' },
    { id: 'wheat', group: 'Rural classics', name: 'Golden Wheat', hint: 'Harvest gold', sw: 'linear-gradient(135deg,#0c0803 0%,#9a5b05 55%,#facc15 100%)' },
    { id: 'soil', group: 'Rural classics', name: 'Red Soil', hint: 'Earth & saffron', sw: 'linear-gradient(135deg,#0e0604 0%,#ad3f18 55%,#f6a355 100%)' },
    { id: 'royal', group: 'Premium signatures', name: 'Royal Amethyst', hint: 'Deep violet · lilac', sw: 'linear-gradient(135deg,#07030f 0%,#6d28d9 55%,#d8b4fe 100%)' },
    { id: 'lagoon', group: 'Premium signatures', name: 'Teal Lagoon', hint: 'Calm teal · aqua', sw: 'linear-gradient(135deg,#020b0b 0%,#0f766e 55%,#5eead4 100%)' },
    { id: 'rose', group: 'Premium signatures', name: 'Rose Quartz', hint: 'Soft magenta · blush', sw: 'linear-gradient(135deg,#11030a 0%,#be185d 55%,#fda4af 100%)' },
    { id: 'indigo', group: 'Premium signatures', name: 'Midnight Indigo', hint: 'Indigo · champagne', sw: 'linear-gradient(135deg,#04061a 0%,#4338ca 55%,#e5c76b 100%)' },
    { id: 'graphite', group: 'Premium signatures', name: 'Graphite Silver', hint: 'Slate · brushed silver', sw: 'linear-gradient(135deg,#06080b 0%,#475569 55%,#cbd5e1 100%)' },
    { id: 'crimson', group: 'Premium signatures', name: 'Royal Crimson', hint: 'Crimson · antique gold', sw: 'linear-gradient(135deg,#0c0204 0%,#a31621 55%,#f2c14e 100%)' }
  ];
  var KEY = 'rc_theme';
  var root = document.documentElement;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  function valid(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return true; return false; }
  function get() { try { var t = localStorage.getItem(KEY); return valid(t) ? t : 'ocean'; } catch (e) { return 'ocean'; } }
  var current = get();
  function apply(id) { current = id; root.setAttribute('data-theme', id); }
  function set(id) {
    try { localStorage.setItem(KEY, id); } catch (e) {}
    if (id === current) return;
    if (!reduced && document.startViewTransition) {
      try { document.startViewTransition(function () { apply(id); }); return; } catch (e) {}
    }
    if (!reduced) {
      root.classList.add('rc-theme-anim');
      apply(id);
      setTimeout(function () { root.classList.remove('rc-theme-anim'); }, 650);
    } else {
      apply(id);
    }
  }

  apply(current); // runs in <head>, so no flash of the wrong colors

  /* ---------- Theme menu ---------- */
  function build() {
    if (document.getElementById('rc-theme-switcher')) return;
    var wrap = document.createElement('div');
    wrap.id = 'rc-theme-switcher';
    wrap.className = 'rc-theme-switcher';
    var html = '<div class="rc-theme-menu" role="menu"><h6>Choose theme</h6>';
    var lastGroup = '';
    THEMES.forEach(function (t, i) {
      if (t.group !== lastGroup) {
        html += '<h6 class="rc-group' + (i === 0 ? ' rc-first' : '') + '">' + t.group + '</h6>';
        lastGroup = t.group;
      }
      html += '<button type="button" class="rc-theme-opt" data-theme-id="' + t.id + '" role="menuitemradio">' +
        '<span class="rc-swatch" style="background:' + t.sw + '"></span>' +
        '<span><strong>' + t.name + '</strong><small>' + t.hint + '</small></span></button>';
    });
    html += '</div><button type="button" class="rc-theme-btn" aria-label="Change theme" aria-haspopup="true">' +
      '<span class="rc-dot"></span><span class="rc-label">Theme</span></button>';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    function mark() {
      wrap.querySelectorAll('.rc-theme-opt').forEach(function (b) {
        var on = b.getAttribute('data-theme-id') === current;
        b.classList.toggle('active', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    mark();
    wrap.querySelector('.rc-theme-btn').addEventListener('click', function (e) {
      e.stopPropagation(); wrap.classList.toggle('open');
    });
    wrap.querySelector('.rc-theme-menu').addEventListener('click', function (e) { e.stopPropagation(); });
    wrap.querySelectorAll('.rc-theme-opt').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation(); set(b.getAttribute('data-theme-id')); mark(); wrap.classList.remove('open');
      });
    });
    document.addEventListener('click', function () { wrap.classList.remove('open'); });
  }

  /* ---------- Ambient layer + cursor-reactive depth ---------- */
  function motion() {
    if (document.querySelector('.rc-ambient')) return;
    var amb = document.createElement('div');
    amb.className = 'rc-ambient';
    amb.setAttribute('aria-hidden', 'true');
    document.body.appendChild(amb);

    if (reduced || !finePointer) return; // static finish only on touch / reduced-motion

    // Only these few elements read --mx/--my, so each frame updates a handful of nodes, not the whole page.
    var targets = [amb];
    document.querySelectorAll('.hero-section, .navbar').forEach(function (el) { targets.push(el); });

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function paint() {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      var sx = cx.toFixed(4), sy = cy.toFixed(4);
      for (var i = 0; i < targets.length; i++) {
        targets[i].style.setProperty('--mx', sx);
        targets[i].style.setProperty('--my', sy);
      }
      if (Math.abs(tx - cx) > 0.0015 || Math.abs(ty - cy) > 0.0015) raf = requestAnimationFrame(paint);
      else raf = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(paint); }

    /* Compact tiles get a soft gloss that follows the pointer and a tiny tilt. */
    var CARD = '.card, .rc-service-card, .fleet-stat, .fleet-booking-card';
    var curCard = null, pending = null, cardRaf = 0;
    function eligible(el) {
      if (el._rcTilt === undefined) {
        var ok = el.offsetWidth <= 520 && el.offsetHeight <= 460 &&
          !el.querySelector('input, select, textarea, table, iframe') && !el.closest('.modal');
        el._rcTilt = ok;
        if (ok) el.setAttribute('data-rc-tilt', '');
      }
      return el._rcTilt;
    }
    function clearCard(el) {
      el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); el.style.removeProperty('--sx');
    }
    function processCard() {
      cardRaf = 0;
      var e = pending; if (!e) return;
      var el = e.target && e.target.closest ? e.target.closest(CARD) : null;
      if (el !== curCard) { if (curCard) clearCard(curCard); curCard = el; }
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.style.setProperty('--sx', x.toFixed(3));
      if (eligible(el)) {
        el.style.setProperty('--tx', (x * 2 - 1).toFixed(3));
        el.style.setProperty('--ty', (y * 2 - 1).toFixed(3));
      }
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
      pending = e;
      if (!cardRaf) cardRaf = requestAnimationFrame(processCard);
    }, { passive: true });

    // ease back to centre when the pointer leaves the window
    document.documentElement.addEventListener('mouseleave', function () {
      tx = 0; ty = 0; kick();
      if (curCard) { clearCard(curCard); curCard = null; }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { tx = 0; ty = 0; kick(); } });
  }

  function init() { build(); motion(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
