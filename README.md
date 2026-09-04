# GAINLINE — Weight Gain Tracker

A lightweight, mobile-first web app for tracking a healthy weight-gain plan: daily calories, protein, water, and weigh-ins. Built for Abhishek H (25, 158 cm, starting at 37 kg) but fully editable for anyone from the **Edit profile** button.

No build step, no backend, no signup — pure HTML/CSS/JS. Your data is saved locally in your own browser (`localStorage`), so it stays private to your device.

## Features

- **Dashboard** — BMI, today's calorie and protein progress, water progress, and a rotating tip, all calculated live from your profile.
- **Food tracker** — log meals with calories and protein; daily calorie goal is auto-calculated from a surplus over your estimated maintenance calories (Mifflin-St Jeor formula).
- **Water tracker** — a tap-to-log glass counter (250 ml/glass) with a visual ring and grid, aimed at a 10-glass (~2.5 L) daily goal.
- **Progress** — log daily weigh-ins and see a trend line toward your target weight, plus total gained and weigh-ins logged.
- **Editable profile** — update name, age, height, weight, target weight, and activity level any time; all goals recalculate automatically.

## Running it locally

No installation needed. Just open `index.html` in any browser:

```bash
git clone <this-repo-url>
cd gainline
open index.html   # macOS
# or just double-click index.html
```

For a nicer local dev loop (auto-reload isn't required, but a local server avoids any browser file:// quirks):

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
- **Protein goal** = 1.8 g × current body weight (kg) — supports gaining lean mass rather than fat alone.
- **Water goal** = 10 glasses (250 ml each ≈ 2.5 L/day), a standard daily hydration target.

These are general fitness estimates, not medical advice — for a BMI this low, it's worth looping in a doctor or dietitian to rule out underlying causes and to get a plan tailored to your health.

## Project structure

```
gainline/
├── index.html   # markup for all four screens + profile modal
├── style.css    # design system and layout
├── app.js       # all app logic, calculations, localStorage persistence
└── README.md
```

## Customizing

- Change the default starting profile in `app.js` → `DEFAULT_PROFILE`.
- Change the water goal in `app.js` → `WATER_GOAL_GLASSES`.
- Colors and type live in `style.css` under `:root` (`--coral`, `--yellow`, `--teal`, etc.) if you want to reskin it.
