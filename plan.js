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
  var MAX_SAVED = 20, MAX_STEPS = 30, MAX_TEXT = 300, MAX_TASK = 140, FLEX_CAP = 8;

  /* Each template: label (shown on the plan), choice (shown in the "Type of task" menu),
     optional verbs (words removed to find the subject, e.g. "draw a cat" -> "a cat"),
     optional fallback (used in place of {subject} when no clear subject is found),
     optional notice (extra reminder shown with the plan), and steps.
     A step is [text, minutes, flex]. A "flex" step may be stretched (up to FLEX_CAP) to use spare time. */
  var TEMPLATES = {
    generic: {
      label: 'General starter plan', choice: 'General plan (any task)',
      steps: [
        ['Get what you need for this within reach, or open it on your screen.', 1],
        ['Write one sentence on what “finished” looks like for this task. Rough is fine.', 3],
        ['List the pieces you can think of. If you are stuck, ask: what do I need, who could help, and what could go wrong?', 4],
        ['Circle the piece that would take five minutes or less. That is your next step.', 2],
        ['Do that piece now, with a timer running.', 5, true],
        ['Look up one thing you do not know yet, or ask one person who might.', 5, true],
        ['Pick the next piece from your list and do it.', 5, true]
      ]
    },
    art: {
      label: 'Drawing and art', choice: 'Drawing, painting, or art',
      verbs: /^(draw(ing)?|paint(ing)?|sketch(ing)?|doodl(e|ing)|illustrat(e|ing)|colou?r(ing)?)(\s+|$)/i,
      fallback: 'what you want to draw',
      steps: [
        ['Get paper and a pencil, or open your drawing app. Anything will do.', 1],
        ['Find one clear photo of {subject}, or look at the real thing if you can. Keep it where you can see it.', 2],
        ['Look for the simplest shapes in it, like circles, ovals, and triangles. Lightly draw only those shapes, big and loose.', 4, true],
        ['Connect the shapes into one outline. Light lines are fine, and wobbly lines are normal.', 5, true],
        ['Add the main details you can see, one at a time.', 5, true],
        ['Erase the guide lines you do not need and darken the lines you like.', 3],
        ['Step back and look at it. Sign it or take a photo. Finished still counts when it is not perfect.', 2]
      ]
    },
    cook: {
      label: 'Cooking and baking', choice: 'Cooking or baking',
      verbs: /^(cook(ing)?|bak(e|ing)|mak(e|ing)|prepar(e|ing)|prep(ping)?|whip up)(\s+|$)/i,
      fallback: 'your dish',
      notice: 'FirstStep does not give amounts, temperatures, or cooking times. Follow the recipe you choose for those.',
      steps: [
        ['Choose one recipe for {subject} and open it where you can see it. If you are unsure, pick the simplest one you can find.', 2],
        ['Wash your hands and clear a little counter space.', 2],
        ['Read the whole recipe once. Note what you already have and what is missing.', 3],
        ['Take out the ingredients and tools the recipe lists and put them in one place.', 3],
        ['Do the prep the recipe describes, using the amounts it gives.', 5, true],
        ['Cook by following the recipe’s directions for heat and timing. Use a timer, and do not guess amounts, temperatures, or times.', 5, true],
        ['Check the recipe for how to tell when it is done and for food safety tips. Then serve, and put leftovers away.', 3]
      ]
    },
    music: {
      label: 'Music practice', choice: 'Music or instrument practice',
      steps: [
        ['Take out your instrument, or open your sheet music, app, or lyrics, and put it where you can see it.', 2],
        ['Warm up with something you already know well. Play it slowly.', 3],
        ['Pick one short section you want to improve. Just one.', 1],
        ['Play that section very slowly, then repeat it a few times. If one spot trips you up, stop and work on only that spot.', 5, true],
        ['Play the section a little faster, only if it feels comfortable.', 3, true],
        ['Play the section inside the whole piece, or record yourself on your phone to listen back.', 5, true]
      ]
    },
    code: {
      label: 'Coding and tech projects', choice: 'Coding or a tech project',
      steps: [
        ['Open the project or an empty file. Read the last thing you wrote, or write your goal as a one-line comment.', 2],
        ['Write down what “working” will look like in plain words, with one example input and the result you expect.', 3],
        ['List the smallest piece that could work, and ignore everything else for now.', 3],
        ['Build or change just that piece. Run it as soon as you can.', 5, true],
        ['If something breaks, read the error message slowly and search it, or ask someone, before changing more.', 5, true],
        ['Save your work. If you use version control, make a small commit.', 2]
      ]
    },
    diy: {
      label: 'Making and fixing things', choice: 'Making, fixing, or crafts',
      notice: 'Follow the safety instructions for any tools or materials you use.',
      steps: [
        ['Put the item and the tools you think you need in one spot.', 2],
        ['Write one sentence on what the finished result should look like.', 2],
        ['Find instructions or a tutorial for this, and pick one to follow.', 4],
        ['Do the first small piece of the instructions. Stop if anything seems unsafe or unclear.', 5, true],
        ['Keep going one piece at a time, checking your progress against the instructions.', 5, true],
        ['Put tools and materials away safely so it is easy to restart.', 3]
      ]
    },
    shop: {
      label: 'Shopping and errands', choice: 'Shopping or errands',
      steps: [
        ['Open your notes app, or grab paper and a pen.', 1],
        ['Write down everything you need. Do not worry about the order.', 3],
        ['Check what you already have and cross those items off.', 3],
        ['Group what is left by shop or section, and note any budget limit you have.', 3],
        ['Go shopping or place the order, and stick to the list.', 5, true],
        ['Put your purchases away and note anything you forgot for next time.', 3]
      ]
    },
    garden: {
      label: 'Garden and plants', choice: 'Garden or plants',
      steps: [
        ['Put on shoes you can get dirty and pick up what you need, like gloves or a watering can.', 2],
        ['Walk around and look. Pick the one plant or patch that needs attention most.', 2],
        ['Check it: does it look dry, crowded, or full of weeds?', 3],
        ['Do the one job it needs most. If you are unsure how, check the care instructions for that plant.', 5, true],
        ['Move to the next plant or patch and do the same.', 5, true],
        ['Put tools away and wash your hands.', 2]
      ]
    },
    plan: {
      label: 'Planning an event or trip', choice: 'Planning an event or trip',
      steps: [
        ['Open a note and write the name of what you are planning at the top.', 1],
        ['Write down the date or dates, who is coming, and any budget limit. Write “not decided” if you do not know yet.', 3],
        ['List everything that needs to be decided or booked.', 4],
        ['Pick the item with the nearest deadline and do the first step for it.', 5, true],
        ['Pick the next item and do the first step for it.', 5, true],
        ['Write down who needs to be told, and send one message.', 3]
      ]
    },
    message: {
      label: 'Messages and email', choice: 'Writing a message or email',
      steps: [
        ['Open a blank reply or new message. Do not write anything yet.', 1],
        ['Write down, in a few words, what you need to say or ask. Rough is fine.', 3],
        ['Write the first sentence only. Wording can be fixed later.', 3, true],
        ['Fill in the rest of the message in plain words. Short is fine.', 5, true],
        ['Read it out loud once and fix anything that sounds odd.', 3],
        ['Check who it is going to, then send it or save it as a draft.', 2]
      ]
    },
    call: {
      label: 'Phone calls and bookings', choice: 'A phone call or booking',
      steps: [
        ['Find the phone number or booking page and keep it open.', 2],
        ['Write 2 or 3 things you need to say or ask, plus any details they might want, like a date or account number.', 4],
        ['Decide when you will make the contact. Set a reminder, or do it now if you feel ready.', 1],
        ['Make the call or send the request. If nobody answers, leave a short message or try again later.', 5, true],
        ['Write down what was agreed, including any dates.', 2]
      ]
    },
    paperwork: {
      label: 'Paperwork and bills', choice: 'Paperwork, bills, or forms',
      steps: [
        ['Put every paper or file for this in one pile, or in one folder on your screen.', 2],
        ['Find the deadline and write it where you will see it.', 2],
        ['List what is missing or unclear. You do not need to solve it yet.', 3],
        ['Fill in or sort just the parts you already know the answers to.', 5, true],
        ['Pick one missing item and take one step toward it, like looking up a number or sending a question.', 5, true],
        ['Put everything back in the pile and write the next step on top.', 2]
      ]
    },
    write: {
      label: 'Writing', choice: 'Writing something longer',
      steps: [
        ['Open a blank page and type a working title.', 1],
        ['Write 3 to 5 rough points about what you want to say. Single words are fine.', 4],
        ['Write the messiest first paragraph you can. Nobody else will see it yet.', 5, true],
        ['Keep going with the next point. Do not stop to edit.', 5, true],
        ['Read what you have and mark anything to fix later.', 3],
        ['Fix one small thing, like the title or the opening line.', 3]
      ]
    },
    study: {
      label: 'Studying and learning', choice: 'Studying or learning',
      steps: [
        ['Gather your notes, book, or course page.', 2],
        ['Write down one question you want to be able to answer by the end.', 2],
        ['Read or watch just one short section. Stop at the end of it.', 5, true],
        ['Without looking, write what you remember in your own words.', 4],
        ['Check what you missed and note one thing to look at again.', 3],
        ['Do one more short section, or try one practice question.', 5, true]
      ]
    },
    clean: {
      label: 'Cleaning and tidying', choice: 'Cleaning or tidying',
      steps: [
        ['Look at the space and pick up one thing that is clearly trash.', 1],
        ['Grab a bag or basket and collect everything that is obviously trash, for 3 minutes.', 3],
        ['Gather dishes, cups, or laundry and take them to where they belong.', 5, true],
        ['Pick one small area, like a desk top or one shelf, and clear it fully.', 5, true],
        ['Put away things that have a home. Leave the rest in a pile for later.', 5, true],
        ['Wipe or sort one more small area, if you still feel like it.', 5, true]
      ]
    },
    move: {
      label: 'Exercise and movement', choice: 'Exercise or a walk',
      notice: 'Go gently. If something hurts or feels wrong, stop.',
      steps: [
        ['Put on shoes or clothes you can move in.', 2],
        ['Do a 2-minute warm-up: walk around, roll your shoulders, or stretch gently.', 2],
        ['Start at an easy pace, easier than you think you need.', 5, true],
        ['Check in with yourself. If something hurts or feels wrong, stop.', 1],
        ['Keep going at a comfortable pace.', 5, true],
        ['Cool down with a slow walk and some water.', 3]
      ]
    },
    digital: {
      label: 'Digital tidying', choice: 'Sorting files, photos, or inbox',
      steps: [
        ['Open the folder, app, or inbox and just look at it.', 1],
        ['Make two places, such as Keep and Delete, or one new folder called To sort.', 2],
        ['Move or delete the easiest 10 items. Skip anything you are unsure about.', 5, true],
        ['Sort 10 more items the same way.', 5, true],
        ['Pick one item you were unsure about and decide now, or leave it with a note.', 3],
        ['Empty the trash only if you are sure. Otherwise leave it for another day.', 2]
      ]
    }
  };

  // Checked in this order; the first match wins. No match means the general plan.
  var RULES = [
    ['digital', /\b(inbox|files?|photos?|folders?|downloads|passwords?|backup|unsubscribe)\b/i],
    ['message', /\b(e-?mails?|repl(y|ies)|respond|messages?|dm|whatsapp|write back|text (back|him|her|them|my|a))\b/i],
    ['call', /\b(call|phone (call|number|him|her|them|the|my|mum|mom|dad)|ring|appointment|schedule|reschedule|cancel|book (a|an|the|my|our|tickets?|time|table))\b/i],
    ['paperwork', /\b(tax(es)?|forms?|bills?|pay|paperwork|insurance|applications?|apply|budget|renew|passport|visa|invoice|expenses?)\b/i],
    ['code', /\b(code|coding|program(ming)?|website|web ?app|script|debug|python|javascript|html|css|github|software|app)\b/i],
    ['write', /\b(write|essay|report|draft|blog|article|cover letter|resume|cv|thesis|proposal|story|speech|presentation|slides|poem|letter|newsletter)\b/i],
    ['music', /\b(guitar|piano|violin|ukulele|drums?|flute|keyboard|instrument|sing|singing|songs?|chords?|scales)\b/i],
    ['diy', /\b(sew(ing)?|knit(ting)?|crochet|crafts?|diy|repair|mend|assemble|build|woodwork|fix (the|my|our|a|an) (tap|faucet|sink|bike|chair|table|door|shelf|fence|lamp|toilet|leak|window|wall)|paint (the|my|our) (walls?|room|fence|door|house|ceiling|kitchen|bedroom))\b/i],
    ['art', /\b(draw(ing)?|sketch(ing)?|doodle|illustrate|paint(ing)?(?! (my|your|her|his|their) nails)|colou?ring|watercolou?r|cartoon|portrait|calligraphy|art)\b/i],
    ['study', /\b(study|learn|revise|revision|exam|test|read|course|homework|practi[sc]e|lesson|class)\b/i],
    ['clean', /\b(clean|tidy|declutter|laundry|dishes|vacuum|mop|sweep|room|kitchen|bathroom|closet|wardrobe|garage|desk|shelf|shelves|bookshelf|bookshelves|drawers|wash)\b/i],
    ['move', /\b(exercise|workout|walk|jog|running|go for a run|gym|stretch|yoga|swim|bike|cycling)\b/i],
    ['cook', /\b(cook(ing)?|meals?|dinner|lunch|breakfast|recipe|bake|baking|cakes?|cookies|bread|soup|pasta|curry|pizza|salad|sandwich|noodles|rice)\b/i],
    ['shop', /\b(buy|shop|shopping|groceries|grocery|errands?|purchase|order (a|an|the|my|some))\b/i],
    ['garden', /\b(garden(ing)?|plants?|lawn|mow|weed(ing)?|repot|seeds?|flowers?)\b/i],
    ['plan', /\b(plan|trip|travel|party|event|wedding|holiday|vacation|itinerary)\b/i]
  ];

  var EXAMPLES = [
    { task: 'Reply to the email I have been avoiding', minutes: 15, energy: 'low' },
    { task: 'Tidy my room', minutes: 15, energy: 'medium' },
    { task: 'Start my essay', minutes: 30, energy: 'medium' },
    { task: 'Pay my electricity bill', minutes: 10, energy: 'low' },
    { task: 'Call the dentist to book a visit', minutes: 10, energy: 'low' },
    { task: 'Go for a walk', minutes: 15, energy: 'low' },
    { task: 'Sort my phone photos', minutes: 30, energy: 'medium' },
    { task: 'Plan a birthday party', minutes: 30, energy: 'high' },
    { task: 'Draw a cat', minutes: 15, energy: 'low' },
    { task: 'Cook dinner', minutes: 30, energy: 'medium' }
  ];

  var CATEGORIES = Object.keys(TEMPLATES).map(function (id) {
    return { id: id, label: TEMPLATES[id].label, choice: TEMPLATES[id].choice };
  });

  var counter = 0;
  function uid() {
    counter += 1;
    return Date.now().toString(36) + counter.toString(36) + Math.floor(Math.random() * 1296).toString(36);
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function capitalize(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }

  // Your words with filler like "I need to" removed. Case is kept (names stay as typed).
  function rawTask(s) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    t = t.replace(/^(i\s+(really\s+)?(need|have|want|should|must|ought)\s+to|i'?m\s+(supposed|trying)\s+to|(need|have|want)\s+to|to)\s+/i, '');
    t = t.replace(/[.!\s]+$/, '');
    return t.slice(0, MAX_TASK);
  }
  function cleanTask(s) { return capitalize(rawTask(s)); }

  function detectCategory(task) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(task)) return RULES[i][0];
    return 'generic';
  }

  // "draw a cat for my friend" -> "a cat". Falls back to a neutral phrase when unclear.
  function subjectOf(raw, tpl) {
    var s = tpl.verbs ? raw.replace(tpl.verbs, '') : raw;
    s = s.split(/\s+(?:for|to|as|in|on|with|that|because|so)\s+/i)[0].trim();
    if (!s || s.length > 40 || s.split(' ').length > 5) return tpl.fallback || 'this';
    return s;
  }

  function wrapStep(energy) {
    return energy === 'low'
      ? { t: 'That is enough for now. Stop here and jot down one line about what comes next.', m: 1 }
      : { t: 'Stop on purpose. Write one line about where you left off and what comes next, so the next start is easy.', m: 2 };
  }

  // kind is optional: a template id chosen by the person, or "auto" to detect from the words.
  function buildPlan(task, minutes, energy, kind) {
    var raw = rawTask(task);
    if (!raw) return null;
    var title = capitalize(raw);
    var n = Number(minutes);
    n = n >= 1 ? Math.min(Math.floor(n), 240) : 15;
    if (!ENERGY[energy]) energy = 'medium';
    var e = ENERGY[energy];
    var picked = !!(kind && kind !== 'auto' && TEMPLATES[kind]);
    var category = picked ? kind : detectCategory(title);
    var tpl = TEMPLATES[category];
    var subject = subjectOf(raw, tpl);
    var wrap = wrapStep(energy);
    var usable = Math.max(Math.floor(n * e.share), 3);
    var chosen = [], total = wrap.m, full = false;
    tpl.steps.forEach(function (s) {
      if (full || chosen.length >= e.maxWork) return;
      // Stop at the first step that does not fit, so steps are never skipped out of order.
      // Aim for the energy-based share of your time, but always allow a second step if it fits your full time.
      var limit = chosen.length < 2 ? n : usable;
      if (chosen.length > 0 && total + s[1] > limit) { full = true; return; }
      chosen.push({ t: s[0], m: s[1], flex: !!s[2] });
      total += s[1];
    });
    // Share spare time evenly among flexible steps, so no single step balloons.
    var spare = usable - total, grew = true;
    while (spare > 0 && grew) {
      grew = false;
      chosen.forEach(function (s) {
        if (spare > 0 && s.flex && s.m < FLEX_CAP) { s.m += 1; spare -= 1; grew = true; }
      });
    }
    chosen.push({ t: wrap.t, m: wrap.m, stop: true });
    return {
      id: 'p' + uid(), task: title, category: category, picked: picked, minutes: n, energy: energy,
      steps: chosen.map(function (s) {
        var step = { id: 's' + uid(), text: s.t.replace(/\{subject\}/g, subject), minutes: s.m, done: false };
        if (s.stop) step.stop = true;
        return step;
      })
    };
  }

  function labelOf(category) { return TEMPLATES[category] ? TEMPLATES[category].label : TEMPLATES.generic.label; }

  // One honest sentence about what kind of plan this is.
  function planNotice(plan) {
    var tpl = TEMPLATES[plan.category] || TEMPLATES.generic;
    if (plan.category === 'generic' && !plan.picked) {
      return 'General starter plan, not specific to your task. FirstStep did not recognise this kind of task, so these steps are general. Edit them to fit.';
    }
    var how = plan.picked ? 'chosen by you' : 'matched from your words';
    return 'Plan type: ' + tpl.label + ' (' + how + ').' + (tpl.notice ? ' ' + tpl.notice : '');
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
      'Time: ' + plan.minutes + ' minutes | Energy: ' + plan.energy,
      planNotice(plan), ''];
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
      task: task, category: TEMPLATES[p.category] ? p.category : 'generic', picked: p.picked === true,
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
    TIME_OPTIONS: TIME_OPTIONS, EXAMPLES: EXAMPLES, CATEGORIES: CATEGORIES, MAX_SAVED: MAX_SAVED,
    cleanTask: cleanTask, detectCategory: detectCategory, buildPlan: buildPlan,
    labelOf: labelOf, planNotice: planNotice,
    toggleStep: toggleStep, updateStep: updateStep, addStep: addStep,
    removeStep: removeStep, moveStep: moveStep, progress: progress,
    planToText: planToText, sanitizeState: sanitizeState, savePlan: savePlan
  };
});
