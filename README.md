# GAINLINE — Weight Gain Tracker

A lightweight, mobile-first web app for tracking a healthy weight-gain plan: calories, protein, carbs, water, sleep, and weigh-ins — with a live IST/Bengaluru clock and per-tracker alarms. Built for Abhishek H (25, 158 cm, starting at 37 kg) but fully editable for anyone from the **Edit profile** button.

No build step, no backend, no signup — pure HTML/CSS/JS. Your data is saved locally in your own browser (`localStorage`), so it stays private to your device.

## Features

- **Live clocks: IST vs. true solar time** — the first clock is ordinary IST clock time. The second is **true apparent solar time** — where the sun actually is in the sky right now — which differs from the clock by a few minutes to half an hour depending on the day (a combination of Bengaluru's longitude relative to India's official time meridian, and the "equation of time" caused by Earth's tilted, elliptical orbit). A line under the clocks states today's exact gap, e.g. *"Clock time (IST) is about 18 min ahead of true solar time in Bengaluru today."*
- **Bengaluru solar timings** — civil dawn, sunrise, solar noon, sunset, and civil dusk, plus total daylight, all computed client-side with an astronomical formula (no API key or internet call needed) for Bengaluru's coordinates.
- **Dashboard** — BMI, calories, protein, carbs, fats, water, and sleep progress at a glance, all calculated live from your profile.
- **Food tracker** — log meals with calories, protein, carbs, and fats; the calorie goal is auto-calculated from a surplus over your estimated maintenance calories (Mifflin-St Jeor formula), with carb and fat goals splitting the remaining calories after protein (60/40 toward carbs, since they're the easiest way to eat through a surplus).
- **Quick-add for shakes/supplements** — one-tap buttons for a weight-gain protein shake, a ragi (finger millet) milk shake, and creatine, prefilled with typical macro estimates for you to check against your actual product/recipe before adding (brands and recipes vary too much to hardcode as fact). Creatine itself carries no calories or protein — it's logged at 0/0/0/0 so it doesn't skew your totals, but still shows up in your history/calendar so you can track that you took it.
- **Water tracker** — a tap-to-log glass counter (250 ml/glass) with a visual ring, aimed at a 10-glass (~2.5 L) daily goal.
- **Sleep tracker** — log bedtime and wake time, see hours slept vs. your sleep goal, and review recent nights.
- **Browse any day** — Food, Water, and Sleep screens all have a day switcher (‹ Today ›) *and* a full calendar picker — tap the date itself to open a month grid, with a small dot marking every day that already has data. Browsing is shared across all three trackers, so flipping to a date on Food keeps Water and Sleep on the same day too. The Progress screen has its own calendar for browsing weigh-in history the same way (read-only — it doesn't change what "today" logs to).
- **Alarms, per tracker, with catch-up** — a meal reminder, a repeating water reminder (every N hours), and bedtime/wake alarms. They ring with an in-app sound + banner and, if you allow it, a browser notification, and now work with **zero internet connection** — nothing about them ever needed network access to begin with. If the app was closed when an alarm was due, reopening it shows a "While you were away" summary of what you missed, so nothing silently slips by.
- **Daily reset at 6:00 AM IST** — food, water, and "today's sleep" all roll over to a fresh day at 6 AM India Standard Time specifically (not local midnight), no matter what timezone the device is actually in.
- **Works offline** — installable as a PWA (Progressive Web App) with a service worker, so once you've opened it online once, it keeps working with no internet connection.
- **Editable profile** — name, age, height, weight, target weight, sleep goal, and activity level; all goals recalculate automatically.

## Not seeing your changes / a previous version keeps showing up?

The service worker caches app files for offline use, and earlier builds of it cached too aggressively (cache-first), which could make an old version stick around even after the files changed. That's fixed now — it's network-first, so an online browser always fetches the latest files and only falls back to cache when there's no connection.

To confirm you're on the latest build, check the small `build 2026-09-05.3`-style tag under the GAINLINE logo in the top-left — compare it against the version noted in the app's latest change notes.

If you were already using an older version of this app in your browser before this fix, do a **one-time hard refresh** to clear out the old stuck cache:
- **Desktop Chrome/Edge:** DevTools (F12) → Application tab → Service Workers → click "Unregister", then hard-reload with `Ctrl+Shift+R` (`Cmd+Shift+R` on Mac).
- **Mobile:** open the site's info/settings and "Clear site data" (or uninstall the "installed" PWA, then revisit the URL and reinstall).
- **Simplest fix on any device:** open the page in a private/incognito window — that never has the old cache, so you can confirm the fix works, then clear the regular window's cache the same way.

After that one-time cleanup, future updates will show up automatically the next time you're online — no more manual clearing needed.

## Running it locally

**Important:** open this with a local server, not by double-clicking `index.html`. Offline support (the service worker) only works over `http://` or `https://` — browsers block service workers on the `file://` protocol. Everything else (tracking, alarms, clocks) works either way, but for the full offline experience, use a server:

```bash
git clone <this-repo-url>
cd gainline
python3 -m http.server 8000
# visit http://localhost:8000 in your browser
```

## Going fully offline (PWA)

1. Serve the app over `http://` or `https://` (a local server, or once deployed to GitHub Pages).
2. Open it in a browser at least once while online — this lets the service worker cache all the app files.
3. After that, the app keeps working with no internet connection at all — reopening the tab, or even opening it in airplane mode, will load the last cached version.
4. On mobile, most browsers will also offer an "Add to Home Screen" / "Install app" prompt (or one from the browser menu) once the manifest is detected — installing it gives you a standalone app icon and window, same as a native app.
5. The Google Fonts used for headings require a connection to load initially; offline, the app falls back to your device's default sans-serif font automatically — nothing breaks.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages** in the repo.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — your app will be live at `https://<username>.github.io/<repo-name>/` within a minute or two, fully offline-capable per the steps above.

## How the numbers are calculated

- **BMI** = weight (kg) / height (m)².
- **Maintenance calories (TDEE)** = Mifflin-St Jeor BMR × activity multiplier.
- **Calorie goal** = TDEE + 500 kcal/day surplus (a moderate, sustainable pace for weight gain).
- **Protein goal** = 1.8 g × current body weight (kg).
- **Carbs / fat goals** = whatever calories remain after protein, split 60% to carbs and 40% to fat — carbs prioritized since they're the easiest way to actually eat through a surplus.
- **Water goal** = 10 glasses (250 ml each ≈ 2.5 L/day).
- **Sleep goal** = set per-profile (default 8 hours).

These are general fitness estimates, not medical advice — for a BMI this low, it's worth looping in a doctor or dietitian to rule out underlying causes and get a plan tailored to your health.

## Alarms — what "offline" actually means here, and what it can't

**Alarms need zero internet connection to work** — they're pure on-device logic (a timer + the browser's Notification API), so airplane mode doesn't affect them at all.

What they genuinely can't do: **ring while the app/browser tab is fully closed.** No plain website — including this one, hosted on GitHub Pages with no backend — can wake up your phone at an exact scheduled time from a closed tab. That capability (a real background alarm) requires either a push-notification server sending the alert at the right moment, or a native app with OS-level scheduling access; a static site has neither. Any web app that claims otherwise is either misleading you or relying on a browser-specific feature (like Chrome's Periodic Background Sync) that's unreliable enough — minimum multi-hour intervals, requires the PWA to be "installed" and used often, no exact-time guarantee — that it wouldn't actually solve "remind me at 1pm."

**What this app does instead, which is the practical, honest fix:** every time you reopen the app, it checks how long it's been since you last had it open. If a meal, bedtime, or wake alarm was scheduled to go off during that gap, you'll immediately see a **"While you were away"** banner (plus a browser notification, if allowed) listing exactly what you missed and when it was due. So reminders never silently vanish — you just see them the moment you're back, instead of at the exact original minute. This check is capped to gaps under 3 days, so returning after a long break doesn't dump a huge stale list on you.

- **Meal reminder** (Food screen) — fires once at a chosen time each day; caught up on reopen if missed.
- **Protein/ragi shake reminder** and **Creatine reminder** (Food screen) — same daily-time pattern as the meal reminder, separate from it, so you can nudge yourself about supplements specifically.
- **Water reminder** (Water screen) — repeats every N hours you set, while the app stays open; catches up its own interval automatically (no missed-list entry needed since it just resumes counting from now).
- **Bedtime / Wake alarms** (Sleep screen) — fire once at their chosen times each day; caught up on reopen if missed.

For alarms to actually work at all (live or caught-up), keep the browser tab open (or the installed PWA running) and allow notifications when prompted.

## The 6 AM IST reset, explained

Every tracked day (food, water, sleep) is keyed to a "app day" that starts at **6:00 AM IST** rather than midnight. So if you log a midnight snack, it still counts toward the day that's ending, not a fresh one — and everything clears out fresh right at 6 AM IST. This is computed from IST directly, so it works the same even if the browser's device timezone is set differently. Weigh-ins and sleep history are never deleted; only the "today" view resets.

## Project structure

```
gainline/
├── index.html      # markup for all five screens + profile modal
├── style.css       # design system and layout
├── app.js          # all app logic, calculations, alarms, localStorage persistence
├── manifest.json   # PWA metadata (name, icons, colors) for installability
├── sw.js           # service worker — caches app files for offline use
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## Customizing

- Change the default starting profile in `app.js` → `DEFAULT_PROFILE`.
- Change the water goal in `app.js` → `WATER_GOAL_GLASSES`.
- Change default alarm times in `app.js` → `DEFAULT_ALARMS`.
- Colors and type live in `style.css` under `:root` (`--coral`, `--yellow`, `--teal`, etc.) if you want to reskin it.
