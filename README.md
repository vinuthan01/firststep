# FirstStep

**Stuck on something? Get a small first step.**

FirstStep is a free web page that helps you begin a task you are putting off. You type what you want to get done, choose how much time and how much energy you have, and it gives you a short plan. The first step is always tiny, and the plan ends with a clear place to stop. You can edit every step, tick them off, add your own, copy the plan, or print it.

- No account, no sign-up, no cost.
- No API key and no AI service. The plan comes from simple built-in templates.
- Your task never leaves your device. The page makes no network requests.
- Works by double-clicking one file. No installing, no command line needed.

> **Screenshot:** see [Add your screenshot](#add-your-screenshot) below.

## Features

- Type any task, or pick one of 8 example tasks.
- Choose time (5 minutes to 1 hour) and energy (low, medium, high). Low energy gives fewer, gentler steps. More time gives longer steps.
- Plans always fit inside the time you chose, start with a step of 2 minutes or less, and end with a "stop on purpose" step.
- Edit the wording or minutes of any step, move steps up or down, remove steps, or add your own.
- Tick steps off and watch a progress bar fill.
- Copy the plan as plain text, or print it (the print view is clean, with no buttons).
- Save plans on your device and reopen them later. Start over any time.
- Mobile-friendly, keyboard-friendly, works with screen readers, respects light and dark mode, and uses large tap targets.

## Run it on Windows

You do not need to install anything.

1. Download this project (on GitHub: green **Code** button, then **Download ZIP**).
2. Right-click the ZIP file and choose **Extract All…**
3. Open the extracted `firststep` folder.
4. Double-click **`index.html`**. It opens in your usual browser (Edge, Chrome, or Firefox).

That's it. Bookmark the page if you want to come back to it.

### Optional: run the checks

The checks need [Node.js](https://nodejs.org) (version 18 or newer). If you want to run them:

1. Open the `firststep` folder in File Explorer, click the address bar, type `cmd`, and press Enter.
2. Type `node --test` and press Enter.

You should see `# pass 13` and `# fail 0`. Nothing is downloaded or installed.

## Examples

**"Reply to the email I have been avoiding", 15 minutes, low energy**

```
[ ] 1. Open a blank reply or new message. Do not write anything yet. (1 min)
[ ] 2. Write down, in a few words, what you need to say or ask. Rough is fine. (3 min)
[ ] 3. Write the first sentence only. Wording can be fixed later. (3 min)
[ ] 4. That is enough for now. Stop here and jot down one line about what comes next. (1 min)
```

**"Start my essay", 30 minutes, medium energy**

```
[ ] 1. Open a blank page and type a working title. (1 min)
[ ] 2. Write 3 to 5 rough points about what you want to say. Single words are fine. (4 min)
[ ] 3. Write the messiest first paragraph you can. Nobody else will see it yet. (5 min)
[ ] 4. Keep going with the next point. Do not stop to edit. (9 min)
[ ] 5. Read what you have and mark anything to fix later. (3 min)
[ ] 6. Stop on purpose. Write one line about where you left off and what comes next, so the next start is easy. (2 min)
```

## Your privacy and your saved data

- Plans are saved **only in your own browser**, using a built-in feature called `localStorage`. They are never uploaded anywhere.
- The current plan saves automatically. Plans you choose to keep appear under **Saved on this device** (up to 20).
- **To clear your data:** press **Clear all saved data** at the bottom of the page. You can also press **Start over** to clear only the current plan, or **Delete** next to a single saved plan.
- Clearing your browser's site data or cookies also removes everything. Using a private or incognito window means nothing is kept after you close it.
- Saved plans live in one browser on one device. They do not sync, and another browser or device will not see them.

## How it works

FirstStep reads the words in your task and picks one of ten step templates (for example messages, phone calls, paperwork, writing, studying, cleaning, moving your body, cooking, digital tidying, or a general one). It then picks as many steps as fit your time and energy. It is a set of rules, **not artificial intelligence**, so it does not truly understand your task. Treat the plan as a starting point and change anything that doesn't fit.

## Limitations

- English only for now, and the task matching is based on simple keywords. Unusual tasks get the general template.
- It does not know the details of your situation. Steps are general, so edit them.
- Saved plans are tied to one browser on one device. Some browsers block saving when a page is opened straight from a file. If so, FirstStep tells you, and the plan still works until you close the page.
- There are no reminders, timers, or calendar links.
- FirstStep is a gentle nudge, **not a substitute for professional advice** of any kind: medical, legal, financial, or mental health. If you are struggling, please talk to a qualified professional. For exercise, stop if something hurts.

## What already exists

A quick search found other tools in this space, such as the open-source desktop app [Nudge](https://github.com/thatsjet/nudge-app) and several mobile apps and prototypes that break tasks into tiny steps (for example TinyStart, Unstuck, and ADHD Focus & Tasks). Many of them use AI services, accounts, or app stores. FirstStep takes a different approach: one file you can open offline, no AI or account, free forever, explicit time and energy choices, and plans you can edit, copy, and print. This was a quick search, not a complete survey, and many similar tools probably exist.

## Add your screenshot

1. Open `index.html` and make a plan.
2. On Windows, press **Windows key + Shift + S**, drag over the page, and save the image.
3. Save it in the `docs` folder as `screenshot.png`.
4. Put this line here in the README, replacing this paragraph:

```
![FirstStep showing a plan](docs/screenshot.png)
```

## Project files

| File | What it does |
| --- | --- |
| `index.html` | The page itself |
| `style.css` | How it looks, including print and dark mode |
| `plan.js` | The plan-building logic (also used by the tests) |
| `app.js` | Connects the buttons and lists to the logic |
| `tests/plan.test.js` | Automatic checks |
| `docs/` | Put your screenshot here |

## Contributing

Ideas and fixes are welcome. Good first contributions: new step templates in `plan.js`, better keyword matching, or translations. Please run `node --test` before sending changes.

## License

MIT. See [LICENSE](LICENSE).

