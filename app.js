/* FirstStep page code: connects the buttons and lists to the logic in plan.js. */
(function () {
  'use strict';
  var FS = window.FirstStep;
  var KEY = 'firststep.v1';
  var state = { current: null, saved: [] };
  var statusTimer;

  function $(id) { return document.getElementById(id); }
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k];
      else if (k === 'class') n.className = props[k];
      else if (k === 'value') n.value = props[k];
      else if (k === 'checked') n.checked = !!props[k];
      else if (k === 'disabled') n.disabled = !!props[k];
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function say(msg) {
    $('status').textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { $('status').textContent = ''; }, 6000);
  }

  // ---- saving in this browser only ----
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) state = FS.sanitizeState(JSON.parse(raw));
    } catch (e) { state = { current: null, saved: [] }; }
  }
  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) {
      say('This browser would not let FirstStep save. Your plan still works, but it will be lost when you close the page.');
      return false;
    }
  }

  // ---- form ----
  function choice(name) { return document.querySelector('input[name="' + name + '"]:checked').value; }
  function setForm(task, minutes, energy) {
    $('task').value = task;
    var m = document.querySelector('input[name="minutes"][value="' + minutes + '"]');
    var e = document.querySelector('input[name="energy"][value="' + energy + '"]');
    if (m) m.checked = true;
    if (e) e.checked = true;
  }
  function makePlan() {
    var plan = FS.buildPlan($('task').value, choice('minutes'), choice('energy'));
    if (!plan) {
      $('formError').textContent = 'Type what you want to get done first. A few words is enough.';
      $('task').focus();
      return;
    }
    $('formError').textContent = '';
    state.current = plan;
    persist();
    renderPlan();
    focusPlan();
  }
  function focusPlan() {
    var t = $('planTitle');
    t.focus();
    t.scrollIntoView({ block: 'start' });
  }

  // ---- plan ----
  function autosize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }
  function updateProgress() {
    var p = FS.progress(state.current);
    $('progress').max = p.total;
    $('progress').value = p.done;
    $('progressText').textContent = p.done + ' of ' + p.total + ' steps done. About ' + p.minutes + ' minutes in total.';
  }
  function renderPlan() {
    var plan = state.current;
    $('planSection').hidden = !plan;
    if (!plan) return;
    $('planTitle').textContent = plan.task;
    $('planMeta').textContent = 'Made for ' + plan.minutes + ' minutes and ' + plan.energy + ' energy. Edit anything you like.';
    var list = $('steps');
    list.textContent = '';
    var last = plan.steps.length - 1;
    plan.steps.forEach(function (s, i) {
      var n = i + 1;
      var li = el('li', { 'class': 'step' + (i === 0 ? ' first' : '') + (s.done ? ' done' : ''), 'data-id': s.id });
      if (i === 0) li.appendChild(el('span', { 'class': 'badge', text: 'Start here' }));
      li.appendChild(el('input', { type: 'checkbox', 'class': 'check', 'aria-label': 'Step ' + n + ' done', checked: s.done }));
      li.appendChild(el('textarea', { 'class': 'text', rows: '1', maxlength: '300', 'aria-label': 'Step ' + n, value: s.text }));
      li.appendChild(el('label', { 'class': 'mins' }, [
        el('input', { type: 'number', 'class': 'min-input', min: '1', max: '240', value: String(s.minutes), 'aria-label': 'Minutes for step ' + n }),
        el('span', { text: 'min' })
      ]));
      li.appendChild(el('div', { 'class': 'tools' }, [
        el('button', { type: 'button', 'data-action': 'up', 'aria-label': 'Move step ' + n + ' up', title: 'Move up', text: '↑', disabled: i === 0 }),
        el('button', { type: 'button', 'data-action': 'down', 'aria-label': 'Move step ' + n + ' down', title: 'Move down', text: '↓', disabled: i === last }),
        el('button', { type: 'button', 'data-action': 'remove', 'aria-label': 'Remove step ' + n, title: 'Remove', text: '✕' })
      ]));
      list.appendChild(li);
    });
    Array.prototype.forEach.call(list.querySelectorAll('textarea'), autosize);
    updateProgress();
  }

  $('steps').addEventListener('input', function (e) {
    var t = e.target, li = t.closest('.step');
    if (!li || !state.current) return;
    if (t.classList.contains('text')) {
      state.current = FS.updateStep(state.current, li.dataset.id, { text: t.value });
      autosize(t);
    } else if (t.classList.contains('min-input')) {
      state.current = FS.updateStep(state.current, li.dataset.id, { minutes: t.value });
    } else { return; }
    persist();
    updateProgress();
  });
  $('steps').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('text')) { e.preventDefault(); e.target.blur(); }
  });
  $('steps').addEventListener('change', function (e) {
    var t = e.target, li = t.closest('.step');
    if (!li || !t.classList.contains('check')) return;
    state.current = FS.toggleStep(state.current, li.dataset.id);
    li.classList.toggle('done', t.checked);
    persist();
    updateProgress();
    var p = FS.progress(state.current);
    if (p.done === p.total) say('Every step is done. Nice work.');
  });
  $('steps').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !state.current) return;
    var id = b.closest('.step').dataset.id, act = b.dataset.action;
    if (act === 'remove') {
      state.current = FS.removeStep(state.current, id);
      if (!state.current.steps.length) { state.current = null; }
    } else if (act === 'up' || act === 'down') {
      state.current = FS.moveStep(state.current, id, act === 'up' ? -1 : 1);
    } else { return; }
    persist();
    renderPlan();
    if (!state.current) { $('task').focus(); return; }
    var again = document.querySelector('[data-id="' + id + '"] [data-action="' + act + '"]:not(:disabled)') ||
      document.querySelector('[data-id="' + id + '"] [data-action]:not(:disabled)');
    if (again) again.focus(); else $('planTitle').focus();
  });

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var next = FS.addStep(state.current, $('newStep').value);
    if (next === state.current) { say('Type your step first, or you may have reached the limit of 30 steps.'); return; }
    state.current = next;
    $('newStep').value = '';
    persist();
    renderPlan();
    $('newStep').focus();
    say('Step added.');
  });

  // ---- buttons ----
  $('form').addEventListener('submit', function (e) { e.preventDefault(); makePlan(); });
  $('copyBtn').addEventListener('click', function () {
    var text = FS.planToText(state.current);
    function fallback() {
      var ta = el('textarea', { 'aria-hidden': 'true', value: text });
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      say(ok ? 'Plan copied. Paste it into a note, message, or document.' : 'Copying did not work here. Try Print instead.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        say('Plan copied. Paste it into a note, message, or document.');
      }, fallback);
    } else { fallback(); }
  });
  $('printBtn').addEventListener('click', function () { window.print(); });
  $('saveBtn').addEventListener('click', function () {
    state.saved = FS.savePlan(state.saved, state.current);
    if (persist()) say('Saved on this device.');
    renderSaved();
  });
  $('resetBtn').addEventListener('click', function () {
    if (!window.confirm('Clear this plan and start over? Plans you saved on this device stay saved.')) return;
    state.current = null;
    setForm('', 15, 'medium');
    $('formError').textContent = '';
    persist();
    renderPlan();
    $('task').focus();
  });
  $('clearAll').addEventListener('click', function () {
    if (!window.confirm('Delete the current plan and every saved plan from this browser? This cannot be undone.')) return;
    try { window.localStorage.removeItem(KEY); } catch (e) { /* nothing to remove */ }
    state = { current: null, saved: [] };
    setForm('', 15, 'medium');
    renderPlan();
    renderSaved();
    $('task').focus();
    say('All saved data was deleted from this browser.');
  });

  // ---- saved plans ----
  function renderSaved() {
    var ul = $('savedList');
    ul.textContent = '';
    $('savedEmpty').hidden = state.saved.length > 0;
    state.saved.forEach(function (p) {
      ul.appendChild(el('li', { 'data-id': p.id }, [
        el('span', { 'class': 'saved-name', text: p.task }),
        el('span', { 'class': 'saved-meta', text: p.minutes + ' min, ' + p.energy + ' energy' }),
        el('button', { type: 'button', 'class': 'btn small', 'data-action': 'open', 'aria-label': 'Open saved plan: ' + p.task, text: 'Open' }),
        el('button', { type: 'button', 'class': 'btn small quiet', 'data-action': 'delete', 'aria-label': 'Delete saved plan: ' + p.task, text: 'Delete' })
      ]));
    });
  }
  $('savedList').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var id = b.closest('li').dataset.id;
    if (b.dataset.action === 'delete') {
      state.saved = state.saved.filter(function (p) { return p.id !== id; });
      persist();
      renderSaved();
      say('Saved plan deleted.');
    } else if (b.dataset.action === 'open') {
      var found = state.saved.filter(function (p) { return p.id === id; })[0];
      if (!found) return;
      state.current = FS.sanitizeState({ current: JSON.parse(JSON.stringify(found)) }).current;
      setForm(state.current.task, state.current.minutes, state.current.energy);
      persist();
      renderPlan();
      focusPlan();
    }
  });

  // ---- start ----
  FS.EXAMPLES.forEach(function (ex) {
    var b = el('button', { type: 'button', 'class': 'btn', text: ex.task });
    b.addEventListener('click', function () { setForm(ex.task, ex.minutes, ex.energy); makePlan(); });
    $('examples').appendChild(b);
  });
  window.addEventListener('resize', function () {
    Array.prototype.forEach.call(document.querySelectorAll('#steps textarea'), autosize);
  });
  load();
  if (state.current) setForm(state.current.task, state.current.minutes, state.current.energy);
  renderPlan();
  renderSaved();
})();
