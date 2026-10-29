/* FirstStep core logic. No browser needed, so it can be tested with Node.
   It works in a page (window.FirstStep) and in Node (require). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FirstStep = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var TIME_OPTIONS = [5, 10, 15, 30, 60];
  // share = how much of your time the plan may use; maxWork = most work steps
  var ENERGY = {
    low: { share: 0.6, maxWork: 3 },
    medium: { share: 0.8, maxWork: 5 },
    high: { share: 1, maxWork: 7 }
  };
  var MAX_SAVED = 20, MAX_STEPS = 30, MAX_TEXT = 300, MAX_TASK = 140;

  // Each step is [text, minutes, flex]. A "flex" step may be stretched to use spare time.
  var TEMPLATES = {
    generic: [
      ['Get what you need for this within reach, or open it on your screen.', 1],
      ['Look at it for two minutes without fixing anything. Then write down the smallest pieces you can see, even if it is only two.', 3],
      ['Pick the easiest piece from your list and do just that one.', 5, true],
      ['Pick the next easiest piece and do it.', 5, true],
      ['Try the piece you have been avoiding, for five minutes only. You are allowed to stop after that.', 5],
      ['Choose one more piece if you still have energy. If not, you are done.', 5, true]
    ],
    message: [
      ['Open a blank reply or new message. Do not write anything yet.', 1],
      ['Write down, in a few words, what you need to say or ask. Rough is fine.', 3],
      ['Write the first sentence only. Wording can be fixed later.', 3, true],
      ['Fill in the rest of the message in plain words. Short is fine.', 5, true],
      ['Read it out loud once and fix anything that sounds odd.', 3],
      ['Check who it is going to, then send it or save it as a draft.', 2]
    ],
    call: [
      ['Find the phone number or booking page and keep it open.', 2],
      ['Write 2 or 3 things you need to say or ask, plus any details they might want, like a date or account number.', 4],
      ['Decide when you will make the contact. Set a reminder, or do it now if you feel ready.', 1],
      ['Make the call or send the request. If nobody answers, leave a short message or try again later.', 5, true],
      ['Write down what was agreed, including any dates.', 2]
    ],
    paperwork: [
      ['Put every paper or file for this in one pile, or in one folder on your screen.', 2],
      ['Find the deadline and write it where you will see it.', 2],
      ['List what is missing or unclear. You do not need to solve it yet.', 3],
      ['Fill in or sort just the parts you already know the answers to.', 5, true],
      ['Pick one missing item and take one step toward it, like looking up a number or sending a question.', 5, true],
      ['Put everything back in the pile and write the next step on top.', 2]
    ],
    write: [
      ['Open a blank page and type a working title.', 1],
      ['Write 3 to 5 rough points about what you want to say. Single words are fine.', 4],
      ['Write the messiest first paragraph you can. Nobody else will see it yet.', 5, true],
      ['Keep going with the next point. Do not stop to edit.', 5, true],
      ['Read what you have and mark anything to fix later.', 3],
      ['Fix one small thing, like the title or the opening line.', 3]
    ],
    study: [
      ['Gather your notes, book, or course page.', 2],
      ['Write down one question you want to be able to answer by the end.', 2],
      ['Read or watch just one short section. Stop at the end of it.', 5, true],
      ['Without looking, write what you remember in your own words.', 4],
      ['Check what you missed and note one thing to look at again.', 3],
      ['Do one more short section, or try one practice question.', 5, true]
    ],
    clean: [
      ['Look at the space and pick up one thing that is clearly trash.', 1],
      ['Grab a bag or basket and collect everything that is obviously trash, for 3 minutes.', 3],
      ['Gather dishes, cups, or laundry and take them to where they belong.', 5, true],
      ['Pick one small area, like a desk top or one shelf, and clear it fully.', 5, true],
      ['Put away things that have a home. Leave the rest in a pile for later.', 5, true],
      ['Wipe or sort one more small area, if you still feel like it.', 5, true]
    ],
    move: [
      ['Put on shoes or clothes you can move in.', 2],
      ['Do a 2-minute warm-up: walk around, roll your shoulders, or stretch gently.', 2],
      ['Start at an easy pace, easier than you think you need.', 5, true],
      ['Check in with yourself. If something hurts or feels wrong, stop.', 1],
      ['Keep going at a comfortable pace.', 5, true],
      ['Cool down with a slow walk and some water.', 3]
    ],
    cook: [
      ['Clear a little counter space and wash your hands.', 2],
      ['Decide what you are making, or pick the simplest option you have ingredients for.', 2],
      ['Take out the ingredients and tools and put them in one place.', 3],
      ['Do the prep: wash, chop, or measure. Just this part.', 5, true],
      ['Start cooking, and set a timer so you do not have to watch the clock.', 5, true],
      ['Put leftovers away and leave pots to soak.', 3]
    ],
    digital: [
      ['Open the folder, app, or inbox and just look at it.', 1],
      ['Make two places, such as Keep and Delete, or one new folder called To sort.', 2],
      ['Move or delete the easiest 10 items. Skip anything you are unsure about.', 5, true],
      ['Sort 10 more items the same way.', 5, true],
      ['Pick one item you were unsure about and decide now, or leave it with a note.', 3],
      ['Empty the trash only if you are sure. Otherwise leave it for another day.', 2]
    ]
  };

  // Checked in this order; the first match wins.
  var RULES = [
    ['digital', /\b(inbox|files?|photos?|folders?|downloads|passwords?|backup|unsubscribe)\b/i],
    ['message', /\b(e-?mails?|repl(y|ies)|respond|messages?|dm|whatsapp|write back|text (back|him|her|them|my|a))\b/i],
    ['call', /\b(call|phone|ring|appointment|schedule|reschedule|cancel|book (a|an|the|my|our|tickets?|time|table))\b/i],
    ['paperwork', /\b(tax(es)?|forms?|bills?|pay|paperwork|insurance|applications?|apply|budget|renew|passport|visa|invoice|expenses?)\b/i],
    ['write', /\b(write|essay|report|draft|blog|article|cover letter|resume|cv|thesis|proposal|story|speech)\b/i],
    ['study', /\b(study|learn|revise|revision|exam|test|read|course|homework|practi[sc]e|lesson|class)\b/i],
    ['clean', /\b(clean|tidy|declutter|laundry|dishes|vacuum|mop|sweep|organi[sz]e|room|kitchen|bathroom|closet|wardrobe|garage|wash)\b/i],
    ['move', /\b(exercise|workout|walk|jog|running|go for a run|gym|stretch|yoga|swim|bike|cycling)\b/i],
    ['cook', /\b(cook|meals?|dinner|lunch|breakfast|recipe|bake|baking)\b/i]
  ];

  var EXAMPLES = [
    { task: 'Reply to the email I have been avoiding', minutes: 15, energy: 'low' },
    { task: 'Tidy my room', minutes: 15, energy: 'medium' },
    { task: 'Start my essay', minutes: 30, energy: 'medium' },
    { task: 'Pay my electricity bill', minutes: 10, energy: 'low' },
    { task: 'Call the dentist to book a visit', minutes: 10, energy: 'low' },
    { task: 'Go for a walk', minutes: 15, energy: 'low' },
    { task: 'Sort my phone photos', minutes: 30, energy: 'medium' },
    { task: 'Plan a birthday party', minutes: 30, energy: 'high' }
  ];

  var counter = 0;
  function uid() {
    counter += 1;
    return Date.now().toString(36) + counter.toString(36) + Math.floor(Math.random() * 1296).toString(36);
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function cleanTask(s) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    t = t.replace(/^(i\s+(really\s+)?(need|have|want|should|must|ought)\s+to|i'?m\s+(supposed|trying)\s+to|(need|have|want)\s+to|to)\s+/i, '');
    t = t.replace(/[.!\s]+$/, '');
    t = t.slice(0, MAX_TASK);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }
  function detectCategory(task) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(task)) return RULES[i][0];
    return 'generic';
  }

  function wrapStep(energy) {
    return energy === 'low'
      ? { t: 'That is enough for now. Stop here and jot down one line about what comes next.', m: 1 }
      : { t: 'Stop on purpose. Write one line about where you left off and what comes next, so the next start is easy.', m: 2 };
  }

  function buildPlan(task, minutes, energy) {
    var title = cleanTask(task);
    if (!title) return null;
    var n = Number(minutes);
    n = n >= 1 ? Math.min(Math.floor(n), 240) : 15;
    if (!ENERGY[energy]) energy = 'medium';
    var e = ENERGY[energy];
    var category = detectCategory(title);
    var wrap = wrapStep(energy);
    var usable = Math.max(Math.floor(n * e.share), 3);
    var picked = [], total = wrap.m;
    TEMPLATES[category].forEach(function (s) {
      if (picked.length >= e.maxWork) return;
      if (picked.length > 0 && total + s[1] > usable) return;
      picked.push({ t: s[0], m: s[1], flex: !!s[2] });
      total += s[1];
    });
    var spare = usable - total;
    if (spare >= 2) {
      for (var i = picked.length - 1; i >= 0; i--) {
        if (picked[i].flex) { picked[i].m += Math.min(spare, 20); break; }
      }
    }
    picked.push({ t: wrap.t, m: wrap.m, stop: true });
    return {
      id: 'p' + uid(), task: title, category: category, minutes: n, energy: energy,
      steps: picked.map(function (s) {
        var step = { id: 's' + uid(), text: s.t, minutes: s.m, done: false };
        if (s.stop) step.stop = true;
        return step;
      })
    };
  }

  // Editing helpers return a NEW plan and never change the old one.
  function copy(plan, steps) {
    var p = {}; Object.keys(plan).forEach(function (k) { p[k] = plan[k]; });
    p.steps = steps; return p;
  }
  function mapStep(plan, id, fn) {
    return copy(plan, plan.steps.map(function (s) {
      if (s.id !== id) return s;
      var c = {}; Object.keys(s).forEach(function (k) { c[k] = s[k]; });
      return fn(c);
    }));
  }
  function toggleStep(plan, id) { return mapStep(plan, id, function (s) { s.done = !s.done; return s; }); }
  function updateStep(plan, id, patch) {
    return mapStep(plan, id, function (s) {
      if (typeof patch.text === 'string') s.text = patch.text.slice(0, MAX_TEXT);
      if (patch.minutes !== undefined && patch.minutes !== '' && isFinite(Number(patch.minutes))) {
        s.minutes = clamp(Math.round(Number(patch.minutes)), 1, 240);
      }
      return s;
    });
  }
  function addStep(plan, text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    if (!t || plan.steps.length >= MAX_STEPS) return plan;
    var step = { id: 's' + uid(), text: t, minutes: 5, done: false };
    var steps = plan.steps.slice(), at = steps.length;
    for (var i = 0; i < steps.length; i++) if (steps[i].stop) { at = i; break; }
    steps.splice(at, 0, step);
    return copy(plan, steps);
  }
  function removeStep(plan, id) {
    return copy(plan, plan.steps.filter(function (s) { return s.id !== id; }));
  }
  function moveStep(plan, id, dir) {
    var steps = plan.steps.slice(), i = -1;
    steps.forEach(function (s, k) { if (s.id === id) i = k; });
    var j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= steps.length) return plan;
    var tmp = steps[i]; steps[i] = steps[j]; steps[j] = tmp;
    return copy(plan, steps);
  }
  function progress(plan) {
    var done = 0, minutes = 0;
    plan.steps.forEach(function (s) { if (s.done) done += 1; minutes += s.minutes; });
    return { done: done, total: plan.steps.length, minutes: minutes };
  }

  function planToText(plan) {
    var lines = ['FirstStep plan: ' + plan.task,
      'Time: ' + plan.minutes + ' minutes | Energy: ' + plan.energy, ''];
    plan.steps.forEach(function (s, i) {
      lines.push((s.done ? '[x] ' : '[ ] ') + (i + 1) + '. ' + String(s.text).trim() + ' (' + s.minutes + ' min)');
    });
    return lines.join('\n');
  }

  // Anything read back from the browser is checked before use.
  function sanitizePlan(p) {
    if (!p || typeof p !== 'object' || typeof p.task !== 'string' || !Array.isArray(p.steps)) return null;
    var task = p.task.replace(/\s+/g, ' ').trim().slice(0, MAX_TASK);
    if (!task) return null;
    var steps = [];
    p.steps.slice(0, MAX_STEPS).forEach(function (s) {
      if (!s || typeof s.text !== 'string') return;
      var step = {
        id: typeof s.id === 'string' && s.id ? s.id.slice(0, 40) : 's' + uid(),
        text: s.text.slice(0, MAX_TEXT),
        minutes: isFinite(Number(s.minutes)) ? clamp(Math.round(Number(s.minutes)), 1, 240) : 5,
        done: s.done === true
      };
      if (s.stop === true) step.stop = true;
      steps.push(step);
    });
    if (!steps.length) return null;
    var m = Number(p.minutes);
    return {
      id: typeof p.id === 'string' && p.id ? p.id.slice(0, 40) : 'p' + uid(),
      task: task, category: TEMPLATES[p.category] ? p.category : 'generic',
      minutes: m >= 1 ? Math.min(Math.floor(m), 240) : 15,
      energy: ENERGY[p.energy] ? p.energy : 'medium', steps: steps
    };
  }
  function sanitizeState(raw) {
    var out = { current: null, saved: [] };
    if (!raw || typeof raw !== 'object') return out;
    out.current = sanitizePlan(raw.current);
    if (Array.isArray(raw.saved)) {
      raw.saved.slice(0, MAX_SAVED).forEach(function (p) {
        var c = sanitizePlan(p); if (c) out.saved.push(c);
      });
    }
    return out;
  }
  function savePlan(list, plan) {
    var clone = sanitizePlan(JSON.parse(JSON.stringify(plan)));
    var rest = list.filter(function (p) { return p.id !== plan.id; });
    return [clone].concat(rest).slice(0, MAX_SAVED);
  }

  return {
    TIME_OPTIONS: TIME_OPTIONS, EXAMPLES: EXAMPLES, MAX_SAVED: MAX_SAVED,
    cleanTask: cleanTask, detectCategory: detectCategory, buildPlan: buildPlan,
    toggleStep: toggleStep, updateStep: updateStep, addStep: addStep,
    removeStep: removeStep, moveStep: moveStep, progress: progress,
    planToText: planToText, sanitizeState: sanitizeState, savePlan: savePlan
  };
});
