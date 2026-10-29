// Run with:  node --test      (needs Node.js 18 or newer, no installs)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const FS = require('../plan.js');

const ROOT = path.join(__dirname, '..');
const TASKS = {
  generic: 'Plan a birthday party', message: 'Reply to the email', call: 'Call the dentist',
  paperwork: 'Pay my electricity bill', write: 'Start my essay', study: 'Study for my exam',
  clean: 'Tidy my room', move: 'Go for a walk', cook: 'Cook dinner', digital: 'Sort my phone photos'
};

test('cleanTask removes filler words and tidies spacing', () => {
  assert.equal(FS.cleanTask('  I need to   clean my room. '), 'Clean my room');
  assert.equal(FS.cleanTask('to call mum!'), 'Call mum');
  assert.equal(FS.cleanTask('   '), '');
  assert.equal(FS.cleanTask(null), '');
  assert.equal(FS.cleanTask('x'.repeat(500)).length, 140);
});

test('detectCategory picks the right template', () => {
  for (const [cat, task] of Object.entries(TASKS)) assert.equal(FS.detectCategory(task), cat, task);
  assert.equal(FS.detectCategory('Write an email to Sam'), 'message');
  assert.equal(FS.detectCategory('Organize my files'), 'digital');
});

test('buildPlan returns null for empty input', () => {
  assert.equal(FS.buildPlan('', 15, 'low'), null);
  assert.equal(FS.buildPlan('   ', 15, 'low'), null);
});

test('every plan fits the time limit, starts tiny, and ends with a stopping point', () => {
  for (const task of Object.values(TASKS)) {
    for (const minutes of FS.TIME_OPTIONS) {
      for (const energy of ['low', 'medium', 'high']) {
        const plan = FS.buildPlan(task, minutes, energy);
        const label = `${task} / ${minutes} / ${energy}`;
        assert.ok(plan.steps.length >= 2, label);
        assert.ok(plan.steps[0].minutes <= 2, `first step is small: ${label}`);
        assert.ok(FS.progress(plan).minutes <= minutes, `fits time: ${label}`);
        assert.equal(plan.steps[plan.steps.length - 1].stop, true, label);
        assert.ok(plan.steps.every((s) => s.text && !s.text.includes("{") && !s.done), label);
      }
    }
  }
});

test('low energy gives fewer steps than high energy', () => {
  const low = FS.buildPlan('Tidy my room', 60, 'low');
  const high = FS.buildPlan('Tidy my room', 60, 'high');
  assert.ok(low.steps.length <= 4);
  assert.ok(low.steps.length < high.steps.length);
});

test('more time gives a longer or equal plan', () => {
  const short = FS.progress(FS.buildPlan('Start my essay', 10, 'medium')).minutes;
  const long = FS.progress(FS.buildPlan('Start my essay', 60, 'medium')).minutes;
  assert.ok(long > short);
});

test('bad time or energy values fall back to safe defaults', () => {
  const plan = FS.buildPlan('Tidy my room', 'banana', 'extreme');
  assert.equal(plan.minutes, 15);
  assert.equal(plan.energy, 'medium');
});

test('editing helpers work and never change the original plan', () => {
  const plan = FS.buildPlan('Tidy my room', 30, 'medium');
  const snapshot = JSON.stringify(plan);
  const id = plan.steps[1].id;

  assert.equal(FS.toggleStep(plan, id).steps[1].done, true);
  assert.equal(FS.updateStep(plan, id, { text: 'New words' }).steps[1].text, 'New words');
  assert.equal(FS.updateStep(plan, id, { minutes: '9999' }).steps[1].minutes, 240);
  assert.equal(FS.updateStep(plan, id, { minutes: '0' }).steps[1].minutes, 1);
  assert.equal(FS.updateStep(plan, id, { minutes: '' }).steps[1].minutes, plan.steps[1].minutes);
  assert.equal(FS.removeStep(plan, id).steps.length, plan.steps.length - 1);

  const moved = FS.moveStep(plan, id, -1);
  assert.equal(moved.steps[0].id, id);
  assert.equal(FS.moveStep(plan, plan.steps[0].id, -1), plan);

  const added = FS.addStep(plan, '  Ask a friend to help  ');
  assert.equal(added.steps.length, plan.steps.length + 1);
  assert.equal(added.steps[added.steps.length - 1].stop, true, 'new step goes before the stopping point');
  assert.equal(FS.addStep(plan, '   '), plan);

  assert.equal(JSON.stringify(plan), snapshot);
});

test('progress counts finished steps and minutes', () => {
  let plan = FS.buildPlan('Tidy my room', 15, 'low');
  plan = FS.toggleStep(plan, plan.steps[0].id);
  const p = FS.progress(plan);
  assert.equal(p.done, 1);
  assert.equal(p.total, plan.steps.length);
});

test('planToText makes a readable checklist', () => {
  let plan = FS.buildPlan('Tidy my room', 15, 'low');
  plan = FS.toggleStep(plan, plan.steps[0].id);
  const lines = FS.planToText(plan).split('\n');
  assert.match(lines[0], /Tidy my room/);
  assert.match(lines[1], /15 minutes/);
  assert.ok(lines[3].startsWith('[x] 1.'));
  assert.ok(lines[4].startsWith('[ ] 2.'));
});

test('sanitizeState survives garbage and keeps good data', () => {
  for (const bad of [null, undefined, 5, 'text', [], { current: 'x', saved: 'y' }, { saved: [null, 1, {}] }]) {
    assert.deepEqual(FS.sanitizeState(bad), { current: null, saved: [] });
  }
  const plan = FS.buildPlan('Tidy my room', 15, 'low');
  const back = FS.sanitizeState(JSON.parse(JSON.stringify({ current: plan, saved: [plan] })));
  assert.deepEqual(back.current, plan);
  assert.equal(back.saved.length, 1);

  const messy = FS.sanitizeState({ current: { task: 'A', minutes: -5, energy: 'wild',
    steps: [{ text: 'x'.repeat(1000), minutes: 'abc', done: 'yes' }, { text: 7 }] } });
  assert.equal(messy.current.energy, 'medium');
  assert.equal(messy.current.steps.length, 1);
  assert.equal(messy.current.steps[0].text.length, 300);
  assert.equal(messy.current.steps[0].done, false);
});

test('savePlan replaces the same plan and keeps at most 20', () => {
  let list = [];
  const first = FS.buildPlan('Tidy my room', 15, 'low');
  list = FS.savePlan(list, first);
  list = FS.savePlan(list, FS.toggleStep(first, first.steps[0].id));
  assert.equal(list.length, 1);
  assert.equal(list[0].steps[0].done, true);
  for (let i = 0; i < 25; i++) list = FS.savePlan(list, FS.buildPlan('Task ' + i, 10, 'low'));
  assert.equal(list.length, FS.MAX_SAVED);
});

test('page files are wired up and the app never uses the network', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const all = [html, app, fs.readFileSync(path.join(ROOT, 'plan.js'), 'utf8'), fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8')].join('\n');

  for (const file of ['style.css', 'plan.js', 'app.js']) {
    assert.ok(html.includes(file) && fs.existsSync(path.join(ROOT, file)), file);
  }
  const used = [...app.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]);
  assert.ok(used.length > 10);
  for (const id of new Set(used)) assert.ok(html.includes(`id="${id}"`), `index.html is missing id "${id}"`);

  assert.ok(!/https?:\/\//i.test(html.replace(/<meta[^>]*>/g, '')), 'no web addresses in index.html');
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/.test(all), 'no network calls');
});
