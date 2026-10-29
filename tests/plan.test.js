// Run with:  node --test      (needs Node.js 18 or newer, no installs)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const FS = require('../plan.js');

const ROOT = path.join(__dirname, '..');
const stepText = (plan) => plan.steps.map((s) => s.text).join('\n');

// One sample task for every template, used by the "fits the time" checks.
const TASKS = {
  generic: 'Decide on a name for my new puppy', message: 'Reply to the email', call: 'Call the dentist',
  paperwork: 'Pay my electricity bill', code: 'Build a website', write: 'Start my essay',
  music: 'Practice guitar', diy: 'Repair my chair', art: 'Draw a cat', study: 'Study for my exam',
  clean: 'Tidy my room', move: 'Go for a walk', cook: 'Cook dinner', shop: 'Buy groceries',
  garden: 'Water my plants', plan: 'Plan a trip', digital: 'Sort my phone photos'
};

test('cleanTask removes filler words and tidies spacing', () => {
  assert.equal(FS.cleanTask('  I need to   clean my room. '), 'Clean my room');
  assert.equal(FS.cleanTask('to call mum!'), 'Call mum');
  assert.equal(FS.cleanTask('   '), '');
  assert.equal(FS.cleanTask(null), '');
  assert.equal(FS.cleanTask('x'.repeat(500)).length, 140);
});

test('every built-in example gets the expected plan type', () => {
  const expected = {
    'Reply to the email I have been avoiding': 'message', 'Tidy my room': 'clean',
    'Start my essay': 'write', 'Pay my electricity bill': 'paperwork',
    'Call the dentist to book a visit': 'call', 'Go for a walk': 'move',
    'Sort my phone photos': 'digital', 'Plan a birthday party': 'plan',
    'Draw a cat': 'art', 'Cook dinner': 'cook'
  };
  assert.equal(FS.EXAMPLES.length, Object.keys(expected).length);
  for (const ex of FS.EXAMPLES) {
    const plan = FS.buildPlan(ex.task, ex.minutes, ex.energy);
    assert.equal(plan.category, expected[ex.task], ex.task);
    assert.equal(plan.picked, false, ex.task);
    assert.ok(plan.steps.length >= 3, ex.task);
    assert.match(FS.planNotice(plan), /matched from your words/, ex.task);
  }
});

test('"draw a cat" gets beginner-friendly drawing steps, not general advice', () => {
  const plan = FS.buildPlan('draw a cat', 15, 'medium');
  const text = stepText(plan);
  assert.equal(plan.category, 'art');
  assert.match(FS.planNotice(plan), /Drawing and art/);
  assert.match(text, /pencil/i);
  assert.match(text, /photo of a cat/i, 'uses what you are drawing');
  assert.match(text, /circles, ovals, and triangles/i);
  assert.doesNotMatch(text, /Pick the next piece/i, 'no generic filler');
  assert.ok(plan.steps[0].minutes <= 2);
});

test('the subject is picked out of your words, and falls back safely', () => {
  assert.match(stepText(FS.buildPlan('Draw my dog for my friend', 15, 'medium')), /photo of my dog,/);
  assert.match(stepText(FS.buildPlan('painting', 15, 'medium')), /photo of what you want to draw/);
  assert.match(stepText(FS.buildPlan('cook', 30, 'medium')), /recipe for your dish/);
  const long = FS.buildPlan('draw ' + 'word '.repeat(12), 15, 'medium');
  assert.match(stepText(long), /photo of what you want to draw/);
});

test('cooking sends people to a recipe and never invents amounts, temperatures, or times', () => {
  for (const task of ['Cook dinner', 'Bake a cake', 'Make pasta', 'cook']) {
    for (const minutes of FS.TIME_OPTIONS) {
      const plan = FS.buildPlan(task, minutes, 'high');
      const text = stepText(plan);
      assert.equal(plan.category, 'cook', task);
      assert.match(text, /recipe/i, task);
      assert.doesNotMatch(text, /\d\s*(°|degrees?|celsius|fahrenheit|grams?|g|kg|ml|litres?|cups?|tsp|tbsp|teaspoons?|tablespoons?|ounces?|oz|lbs?|minutes?|mins?|hours?|seconds?)\b/i, `${task} / ${minutes}`);
      assert.match(FS.planNotice(plan), /does not give amounts, temperatures, or cooking times/i);
      assert.match(FS.planToText(plan), /follow the recipe you choose/i);
    }
  }
  assert.match(stepText(FS.buildPlan('Cook dinner', 60, 'high')), /do not guess amounts, temperatures, or times/i);
});

test('an unfamiliar task gets a clearly labeled general plan', () => {
  const plan = FS.buildPlan('Decide on a name for my new puppy', 15, 'medium');
  assert.equal(plan.category, 'generic');
  assert.equal(plan.picked, false);
  assert.match(FS.planNotice(plan), /General starter plan, not specific to your task/);
  assert.match(FS.planToText(plan), /not specific to your task/);
  assert.match(stepText(plan), /finished/i);
  assert.ok(plan.steps.length >= 3);
  for (const odd of ['Organise the annual neighbourhood quiz night', 'Convince my landlord', 'xyzzy']) {
    assert.equal(FS.buildPlan(odd, 15, 'low').category, 'generic', odd);
  }
});

test('choosing a type yourself overrides the guess, including the general plan', () => {
  const art = FS.buildPlan('Decide on a name for my new puppy', 15, 'medium', 'art');
  assert.equal(art.category, 'art');
  assert.equal(art.picked, true);
  assert.match(FS.planNotice(art), /chosen by you/);
  const general = FS.buildPlan('Draw a cat', 15, 'medium', 'generic');
  assert.equal(general.category, 'generic');
  assert.match(FS.planNotice(general), /General starter plan/);
  assert.equal(FS.buildPlan('Draw a cat', 15, 'medium', 'auto').category, 'art');
  assert.equal(FS.buildPlan('Draw a cat', 15, 'medium', 'nonsense').category, 'art');
  assert.ok(FS.CATEGORIES.length >= 17);
});

test('task wording is matched to sensible types', () => {
  const table = {
    'write code for my game': 'code', 'Practice guitar': 'music', 'Paint the wall': 'diy',
    'Painting a picture': 'art', 'Fix my bike chain': 'diy', 'Organise the quiz night': 'generic', 'Set up my new phone': 'generic', 'Paint my nails': 'generic', 'Prepare a presentation': 'write', 'Reorganise my bookshelf': 'clean', 'Phone the bank': 'call', 'Phone my mum': 'call', 'Organize my desk': 'clean', 'Fix the sink': 'diy',
    'Fix my resume': 'write', 'Buy groceries': 'shop', 'Water my plants': 'garden',
    'Plan my study week': 'study', 'Bake a cake for my friend': 'cook', 'Sew a button': 'diy',
    'Write an email to Sam': 'message', 'Organize my files': 'digital', 'Plan a trip to Goa': 'plan',
    'I need to sketch a portrait': 'art', 'Learn Spanish': 'study', 'Stretch for ten minutes': 'move'
  };
  for (const [task, cat] of Object.entries(table)) assert.equal(FS.detectCategory(task), cat, task);
});

test('buildPlan returns null for empty input', () => {
  assert.equal(FS.buildPlan('', 15, 'low'), null);
  assert.equal(FS.buildPlan('   ', 15, 'low'), null);
});

test('every plan fits the time limit, starts tiny, ends with a stopping point, and has no leftover placeholders', () => {
  for (const [cat, task] of Object.entries(TASKS)) {
    assert.equal(FS.detectCategory(task), cat, task);
    for (const minutes of FS.TIME_OPTIONS) {
      for (const energy of ['low', 'medium', 'high']) {
        const plan = FS.buildPlan(task, minutes, energy);
        const label = `${task} / ${minutes} / ${energy}`;
        assert.ok(plan.steps.length >= 2, label);
        assert.ok(plan.steps[0].minutes <= 2, `first step is small: ${label}`);
        assert.ok(FS.progress(plan).minutes <= minutes, `fits time: ${label}`);
        assert.ok(plan.steps.every((s) => s.minutes <= 8 || s.stop === true || s.minutes <= 5), `no ballooning step: ${label}`);
        assert.equal(plan.steps[plan.steps.length - 1].stop, true, label);
        assert.ok(plan.steps.every((s) => s.text && !s.text.includes('{') && !s.done), label);
      }
    }
  }
});

test('steps are never skipped: a later step only appears with the earlier ones', () => {
  for (const minutes of FS.TIME_OPTIONS) {
    for (const energy of ['low', 'medium', 'high']) {
      const text = stepText(FS.buildPlan('Draw a cat', minutes, energy));
      if (/Erase the guide lines/.test(text)) assert.match(text, /Connect the shapes/, `${minutes}/${energy}`);
      if (/Connect the shapes/.test(text)) assert.match(text, /simplest shapes/, `${minutes}/${energy}`);
      const cook = stepText(FS.buildPlan('Cook dinner', minutes, energy));
      if (/Cook by following/.test(cook)) assert.match(cook, /Do the prep/, `cook ${minutes}/${energy}`);
    }
  }
});

test('spare time is shared out, so no simple step balloons', () => {
  const plan = FS.buildPlan('Tidy my room', 60, 'high');
  const longest = Math.max(...plan.steps.map((s) => s.minutes));
  assert.ok(longest <= 8, `longest step was ${longest} minutes`);
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

test('planToText makes a readable, labeled checklist', () => {
  let plan = FS.buildPlan('Tidy my room', 15, 'low');
  plan = FS.toggleStep(plan, plan.steps[0].id);
  const lines = FS.planToText(plan).split('\n');
  assert.match(lines[0], /Tidy my room/);
  assert.match(lines[1], /15 minutes/);
  assert.match(lines[2], /Plan type: Cleaning and tidying/);
  assert.ok(lines[4].startsWith('[x] 1.'));
  assert.ok(lines[5].startsWith('[ ] 2.'));
});

test('sanitizeState survives garbage and keeps good data', () => {
  for (const bad of [null, undefined, 5, 'text', [], { current: 'x', saved: 'y' }, { saved: [null, 1, {}] }]) {
    assert.deepEqual(FS.sanitizeState(bad), { current: null, saved: [] });
  }
  const plan = FS.buildPlan('Draw a cat', 15, 'low', 'art');
  const back = FS.sanitizeState(JSON.parse(JSON.stringify({ current: plan, saved: [plan] })));
  assert.deepEqual(back.current, plan);
  assert.equal(back.saved.length, 1);

  const messy = FS.sanitizeState({ current: { task: 'A', minutes: -5, energy: 'wild', category: 'hacked',
    steps: [{ text: 'x'.repeat(1000), minutes: 'abc', done: 'yes' }, { text: 7 }] } });
  assert.equal(messy.current.energy, 'medium');
  assert.equal(messy.current.category, 'generic');
  assert.equal(messy.current.steps.length, 1);
  assert.equal(messy.current.steps[0].text.length, 300);
  assert.equal(messy.current.steps[0].done, false);

  // Plans saved by the first version (no "picked" field) still load.
  const old = FS.sanitizeState({ current: { id: 'p1', task: 'Tidy', category: 'clean', minutes: 15, energy: 'low',
    steps: [{ id: 's1', text: 'Do it', minutes: 2, done: false }] } });
  assert.equal(old.current.category, 'clean');
  assert.equal(old.current.picked, false);
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
  assert.ok(used.includes('kind') && used.includes('planNotice'));
  for (const id of new Set(used)) assert.ok(html.includes(`id="${id}"`), `index.html is missing id "${id}"`);

  assert.ok(!/https?:\/\//i.test(html.replace(/<meta[^>]*>/g, '')), 'no web addresses in index.html');
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/.test(all), 'no network calls');
});
