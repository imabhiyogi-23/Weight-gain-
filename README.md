# GAINLINE — Weight Gain Tracker

A lightweight, mobile-first web app for tracking a healthy weight-gain plan: calories, protein, carbs, water, sleep, and weigh-ins — with a live IST/Bengaluru clock and per-tracker alarms. Built for Abhishek H (25, 158 cm, starting at 37 kg) but fully editable for anyone from the **Edit profile** button.

No build step, no backend, no signup — pure HTML/CSS/JS. Your data is saved locally in your own browser (`localStorage`), so it stays private to your device.

## Features

- **Live clock** — IST and Bengaluru time side by side (Bengaluru runs on IST, so they always match — that's expected, not a bug).
- **Bengaluru sun timings** — today's sunrise, sunset, and total daylight, computed client-side with an astronomical formula (no API key or internet call needed) for Bengaluru's coordinates.
- **Dashboard** — BMI, calories, protein, carbs, water, and sleep progress at a glance, all calculated live from your profile.
- **Food tracker** — log meals with calories, protein, and carbs; daily calorie goal is auto-calculated from a surplus over your estimated maintenance calories (Mifflin-St Jeor formula), with a carbs goal at ~4g/kg bodyweight.
- **Water tracker** — a tap-to-log glass counter (250 ml/glass) with a visual ring, aimed at a 10-glass (~2.5 L) daily goal.
- **Sleep tracker** — log bedtime and wake time, see hours slept vs. your sleep goal, and review recent nights.
- **Alarms, per tracker** — a meal reminder, a repeating water reminder (every N hours), and bedtime/wake alarms. Alarms ring with an in-app sound + banner and, if you allow it, a browser notification.
- **Daily reset at 6:00 AM IST** — food, water, and "today's sleep" all roll over to a fresh day at 6 AM India Standard Time specifically (not local midnight), no matter what timezone the device is actually in.
- **Editable profile** — name, age, height, weight, target weight, sleep goal, and activity level; all goals recalculate automatically.

## Running it locally

No installation needed. Just open `index.html` in any browser:

```bash
git clone <this-repo-url>
cd gainline
open index.html   # macOS
# or just double-click index.html
```

For a nicer local dev loop (not required, but avoids any browser file:// quirks):

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages** in the repo.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — your app will be live at `https://<username>.github.io/<repo-name>/` within a minute or two.

## How the numbers are calculated

- **BMI** = weight (kg) / height (m)².
- **Maintenance calories (TDEE)** = Mifflin-St Jeor BMR × activity multiplier.
- **Calorie goal** = TDEE + 500 kcal/day surplus (a moderate, sustainable pace for weight gain).
- **Protein goal** = 1.8 g × current body weight (kg).
- **Carbs goal** = 4 g × current body weight (kg) — enough fuel to actually eat through the surplus.
- **Water goal** = 10 glasses (250 ml each ≈ 2.5 L/day).
- **Sleep goal** = set per-profile (default 8 hours).

These are general fitness estimates, not medical advice — for a BMI this low, it's worth looping in a doctor or dietitian to rule out underlying causes and get a plan tailored to your health.

## Alarms — how they actually work

This is a static site with no backend, so alarms only fire **while the app tab is open** in a browser (there's no server to push notifications when it's closed). When you flip an alarm on, the browser will ask permission to show notifications — allow it if you want a system-level popup in addition to the in-app sound/banner. If you need alarms that fire even when the app/browser is closed, that requires a native app or a backend + push service, which is outside what a plain GitHub Pages site can do.

- **Meal reminder** (Food screen) — fires once at a chosen time each day.
- **Water reminder** (Water screen) — repeats every N hours you set, while the app stays open.
- **Bedtime / Wake alarms** (Sleep screen) — fire once at their chosen times each day.

## The 6 AM IST reset, explained

Every tracked day (food, water, sleep) is keyed to a "app day" that starts at **6:00 AM IST** rather than midnight. So if you log a midnight snack, it still counts toward the day that's ending, not a fresh one — and everything clears out fresh right at 6 AM IST. This is computed from IST directly, so it works the same even if the browser's device timezone is set differently. Weigh-ins and sleep history are never deleted; only the "today" view resets.

## Project structure

```
gainline/
├── index.html   # markup for all five screens + profile modal
├── style.css    # design system and layout
├── app.js       # all app logic, calculations, alarms, localStorage persistence
└── README.md
```

## Customizing

- Change the default starting profile in `app.js` → `DEFAULT_PROFILE`.
- Change the water goal in `app.js` → `WATER_GOAL_GLASSES`.
- Change default alarm times in `app.js` → `DEFAULT_ALARMS`.
- Colors and type live in `style.css` under `:root` (`--coral`, `--yellow`, `--teal`, etc.) if you want to reskin it.
