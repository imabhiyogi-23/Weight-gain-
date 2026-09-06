(() => {
  "use strict";

  /* ============ Build/version — bump this on every real change ============ */
  const APP_VERSION = "2026-09-06.1";

  /* ============ Offline support (PWA) ============ */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js")
        .then((reg) => reg.update()) // always check for a newer sw.js right away
        .catch(() => { /* offline caching unavailable, app still works online */ });
    });
  }

  const buildTagEl = document.getElementById("buildTag");
  if (buildTagEl) buildTagEl.textContent = `build ${APP_VERSION}`;

  /* ============ IST-aware date helpers ============ */
  // Returns a Date object whose get*() components equal IST wall-clock time,
  // regardless of the device's actual timezone.
  function getISTNow() {
    const now = new Date();
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    return new Date(istString);
  }

  function fmtDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // The "app day" rolls over at 6:00 AM IST, not midnight — so all trackers
  // reset fresh every morning at 6 IST, wherever the device actually is.
  function appDayKey() {
    const ist = getISTNow();
    const anchor = new Date(ist);
    if (ist.getHours() < 6) anchor.setDate(anchor.getDate() - 1);
    return fmtDateKey(anchor);
  }

  /* ============ Storage keys & helpers ============ */
  const K_PROFILE = "gainline_profile";
  const K_START = "gainline_start_date";
  const K_WEIGHTLOG = "gainline_weight_log";
  const K_SLEEPLOG = "gainline_sleep_log";
  const K_ALARMS = "gainline_alarms";
  const foodKey = (d) => `gainline_food_${d}`;
  const waterKey = (d) => `gainline_water_${d}`;

  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const DEFAULT_PROFILE = {
    name: "Abhishek H",
    age: 25,
    height: 158,
    weight: 37,
    target: 55,
    activity: 1.375,
    sleepGoal: 8
  };

  const DEFAULT_ALARMS = {
    food: { enabled: false, time: "13:00" },
    water: { enabled: false, intervalHours: 2, lastFiredAt: null },
    bedtime: { enabled: false, time: "22:30" },
    wake: { enabled: false, time: "06:30" }
  };

  const WATER_GOAL_GLASSES = 10; // ~2500ml, standard daily hydration target
  const GLASS_ML = 250;

  let profile = { ...DEFAULT_PROFILE, ...load(K_PROFILE, {}) };
  let alarms = { ...DEFAULT_ALARMS, ...load(K_ALARMS, {}) };
  if (!load(K_START, null)) save(K_START, appDayKey());

  /* ============ Derived goals ============ */
  function computeGoals(p) {
    const heightM = p.height / 100;
    const bmi = p.weight / (heightM * heightM);

    let bmiCategory;
    if (bmi < 18.5) bmiCategory = "Underweight — building a surplus will help";
    else if (bmi < 25) bmiCategory = "Healthy range — keep building steadily";
    else if (bmi < 30) bmiCategory = "Overweight range";
    else bmiCategory = "Obese range";

    // Mifflin-St Jeor (male assumption, adjust if needed)
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
    const tdee = bmr * Number(p.activity);
    const calorieGoal = Math.round((tdee + 500) / 10) * 10;
    const proteinGoal = Math.round(p.weight * 1.8);

    // Split the remaining calories (after protein) mostly toward carbs, since
    // carbs are the easiest way to actually eat through a surplus, with the
    // rest going to fats.
    const proteinCals = proteinGoal * 4;
    const remainingCals = Math.max(0, calorieGoal - proteinCals);
    const carbsGoal = Math.round((remainingCals * 0.6) / 4);
    const fatsGoal = Math.round((remainingCals * 0.4) / 9);

    return { bmi, bmiCategory, bmr, tdee, calorieGoal, proteinGoal, carbsGoal, fatsGoal };
  }

  /* ============ Live clocks (IST clock time + Bengaluru true solar time) ============ */
  // solarOffsetMinutes = how many minutes the IST clock is ahead of true
  // apparent solar time in Bengaluru today (negative = clock is behind).
  // Recomputed once an hour in renderSunTimes(); consumed every second here.
  let solarOffsetMinutes = 0;

  function setHands(prefix, h, m, s) {
    const hourDeg = (h % 12) * 30 + m * 0.5;
    const minDeg = m * 6 + s * 0.1;
    const secDeg = s * 6;
    const hourEl = document.getElementById(`hour${prefix}`);
    const minEl = document.getElementById(`min${prefix}`);
    const secEl = document.getElementById(`sec${prefix}`);
    if (hourEl) hourEl.style.transform = `rotate(${hourDeg}deg)`;
    if (minEl) minEl.style.transform = `rotate(${minDeg}deg)`;
    if (secEl) secEl.style.transform = `rotate(${secDeg}deg)`;
  }

  function renderClocks() {
    const ist = getISTNow();
    const h = ist.getHours(), m = ist.getMinutes(), s = ist.getSeconds();
    const timeStr = ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const dateStr = ist.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

    document.getElementById("clockIST").textContent = timeStr;
    document.getElementById("clockISTDate").textContent = dateStr;
    setHands("IST", h, m, s);

    // True apparent solar time = clock time shifted by today's solar offset
    // (longitude-from-IST-meridian correction + equation of time, combined).
    const solarMs = ist.getTime() - solarOffsetMinutes * 60000;
    const solarDate = new Date(solarMs);
    const sh = solarDate.getHours(), sm = solarDate.getMinutes(), ss = solarDate.getSeconds();
    document.getElementById("clockBLR").textContent = formatHMS(sh, sm, ss);
    setHands("BLR", sh, sm, ss);
  }
  renderClocks();
  setInterval(renderClocks, 1000);

  function formatHMS(h, m, s) {
    const period = h >= 12 ? "pm" : "am";
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${period}`;
  }

  /* ============ Bengaluru solar timings ============ */
  // General-purpose sunrise equation (astronomical, computed client-side —
  // no API needed). Accurate to within about a minute.
  const BLR_LAT = 12.9716, BLR_LON = 77.5946;

  function sunAngleTimes(year, month, day, lat, lon, angleDeg) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;

    // Julian Day Number (Fliegel & Van Flandern algorithm)
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
      Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    const n = jdn - 2451545;
    const Jstar = n - lon / 360;

    let M = (357.5291 + 0.98560028 * Jstar) % 360;
    if (M < 0) M += 360;
    const Mrad = toRad(M);

    const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
    let lambda = (M + 102.9372 + C + 180) % 360;
    if (lambda < 0) lambda += 360;
    const lambdaRad = toRad(lambda);

    const Jtransit = 2451545 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);

    const sinDelta = Math.sin(lambdaRad) * Math.sin(toRad(23.4397));
    const cosDelta = Math.cos(Math.asin(sinDelta));
    const latRad = toRad(lat);
    const cosOmega0 = (Math.sin(toRad(-angleDeg)) - Math.sin(latRad) * sinDelta) / (Math.cos(latRad) * cosDelta);

    if (cosOmega0 > 1 || cosOmega0 < -1) return null; // not applicable this close to the equator
    const omega0 = toDeg(Math.acos(cosOmega0));

    const jdToDate = (j) => new Date((j - 2440587.5) * 86400000);
    return {
      rise: jdToDate(Jtransit - omega0 / 360),
      set: jdToDate(Jtransit + omega0 / 360),
      transit: jdToDate(Jtransit)
    };
  }

  function toISTComponents(date) {
    // Same trick as getISTNow(), but for an arbitrary Date instead of "now".
    const s = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    return new Date(s);
  }

  function renderSunTimes() {
    const ist = getISTNow(); // gives IST calendar date regardless of device timezone
    const y = ist.getFullYear(), m = ist.getMonth() + 1, d = ist.getDate();
    const std = sunAngleTimes(y, m, d, BLR_LAT, BLR_LON, 0.833);   // sunrise/sunset
    const civil = sunAngleTimes(y, m, d, BLR_LAT, BLR_LON, 6);      // civil dawn/dusk
    if (!std || !civil) return;

    const fmt = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
    document.getElementById("dawnValue").textContent = fmt(civil.rise);
    document.getElementById("sunriseValue").textContent = fmt(std.rise);
    document.getElementById("solarNoonValue").textContent = fmt(std.transit);
    document.getElementById("sunsetValue").textContent = fmt(std.set);
    document.getElementById("duskValue").textContent = fmt(civil.set);

    const daylightMs = std.set - std.rise;
    const hrs = Math.floor(daylightMs / 3600000);
    const mins = Math.round((daylightMs % 3600000) / 60000);
    document.getElementById("daylightLength").textContent = `${hrs}h ${mins}m`;

    // Solar noon (std.transit) is the instant the sun is truest overhead —
    // i.e. when apparent solar time reads exactly 12:00. Comparing that
    // instant's IST clock reading to 12:00 gives how far the clock has
    // drifted from the sun today (longitude offset + equation of time).
    const transitIST = toISTComponents(std.transit);
    const minutesSinceMidnight = transitIST.getHours() * 60 + transitIST.getMinutes() + transitIST.getSeconds() / 60;
    solarOffsetMinutes = minutesSinceMidnight - 720;

    const absMin = Math.round(Math.abs(solarOffsetMinutes));
    const direction = solarOffsetMinutes >= 0 ? "ahead of" : "behind";
    document.getElementById("solarOffsetNote").textContent =
      `Clock time (IST) is about ${absMin} min ${direction} true solar time in Bengaluru today.`;
  }
  renderSunTimes();
  renderClocks(); // repaint now that the real solar offset is known (avoids a brief flash)
  setInterval(renderSunTimes, 60 * 60 * 1000); // recompute hourly, rolls to a new day naturally

  /* ============ Day-to-day browsing state ============ */
  // Shared across Food, Water and Sleep screens — browsing one moves all three,
  // so switching tabs keeps looking at the same day.
  let viewDate = appDayKey();

  function shiftViewDate(deltaDays) {
    const d = new Date(viewDate + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    const candidate = fmtDateKey(d);
    if (candidate > appDayKey()) return; // no browsing into the future
    viewDate = candidate;
    renderAll();
  }

  function jumpToToday() {
    viewDate = appDayKey();
    renderAll();
  }

  function formatDateLabel(dayKey) {
    const today = appDayKey();
    const yesterday = fmtDateKey(new Date(new Date(today + "T00:00:00").getTime() - 86400000));
    if (dayKey === today) return "Today";
    if (dayKey === yesterday) return "Yesterday";
    const d = new Date(dayKey + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  }

  function wireDateNav(prefix) {
    const prevBtn = document.getElementById(`${prefix}PrevDay`);
    const nextBtn = document.getElementById(`${prefix}NextDay`);
    const todayBtn = document.getElementById(`${prefix}JumpToday`);
    if (!prevBtn) return;
    prevBtn.addEventListener("click", () => shiftViewDate(-1));
    nextBtn.addEventListener("click", () => shiftViewDate(1));
    todayBtn.addEventListener("click", jumpToToday);
  }

  function renderDateNav(prefix) {
    const label = document.getElementById(`${prefix}DateLabel`);
    const nextBtn = document.getElementById(`${prefix}NextDay`);
    const todayBtn = document.getElementById(`${prefix}JumpToday`);
    if (!label) return;
    label.textContent = formatDateLabel(viewDate);
    const isToday = viewDate === appDayKey();
    nextBtn.disabled = isToday;
    todayBtn.classList.toggle("show", !isToday);
  }

  ["food", "water", "sleep"].forEach(wireDateNav);


  const screens = document.querySelectorAll(".screen");
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.screen;
      screens.forEach((s) => s.classList.toggle("active", s.id === `screen-${target}`));
      navItems.forEach((n) => n.classList.toggle("active", n === btn));
      if (target === "progress") renderWeightChart();
    });
  });

  /* ============ Profile modal ============ */
  const modalBackdrop = document.getElementById("modalBackdrop");
  const profileForm = document.getElementById("profileForm");

  function openProfileModal() {
    document.getElementById("pName").value = profile.name;
    document.getElementById("pAge").value = profile.age;
    document.getElementById("pHeight").value = profile.height;
    document.getElementById("pWeight").value = profile.weight;
    document.getElementById("pTarget").value = profile.target;
    document.getElementById("pSleepGoal").value = profile.sleepGoal;
    document.getElementById("pActivity").value = profile.activity;
    modalBackdrop.classList.add("open");
  }
  function closeProfileModal() { modalBackdrop.classList.remove("open"); }

  document.getElementById("editProfileBtn").addEventListener("click", openProfileModal);
  document.getElementById("cancelProfileBtn").addEventListener("click", closeProfileModal);
  modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeProfileModal(); });

  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    profile = {
      name: document.getElementById("pName").value.trim() || "Athlete",
      age: Number(document.getElementById("pAge").value),
      height: Number(document.getElementById("pHeight").value),
      weight: Number(document.getElementById("pWeight").value),
      target: Number(document.getElementById("pTarget").value),
      sleepGoal: Number(document.getElementById("pSleepGoal").value),
      activity: Number(document.getElementById("pActivity").value)
    };
    save(K_PROFILE, profile);
    closeProfileModal();
    renderAll();
  });

  /* ============ Dashboard render ============ */
  function renderDashboard() {
    const g = computeGoals(profile);
    document.getElementById("heroName").textContent =
      `Hey ${profile.name.split(" ")[0]}, let's put on some weight.`;
    document.getElementById("currentWeightHero").textContent = profile.weight.toFixed(1);
    document.getElementById("targetWeightHero").textContent = profile.target.toFixed(1);

    const startKey = load(K_START, appDayKey());
    const diffDays = Math.max(1, dayDiff(startKey, appDayKey()) + 1);
    document.getElementById("dayStreak").textContent = diffDays;

    document.getElementById("bmiValue").textContent = g.bmi.toFixed(1);
    document.getElementById("bmiCategory").textContent = g.bmiCategory;
    const markerPct = Math.min(100, Math.max(0, (g.bmi / 40) * 100));
    document.getElementById("bmiScaleMarker").style.left = markerPct + "%";

    const food = load(foodKey(appDayKey()), []);
    const water = load(waterKey(appDayKey()), 0);
    const eatenCal = food.reduce((s, f) => s + f.calories, 0);
    const eatenProtein = food.reduce((s, f) => s + (f.protein || 0), 0);
    const eatenCarbs = food.reduce((s, f) => s + (f.carbs || 0), 0);
    const eatenFats = food.reduce((s, f) => s + (f.fats || 0), 0);

    document.getElementById("caloriesEatenToday").textContent = eatenCal;
    document.getElementById("calorieGoalDisplay").textContent = g.calorieGoal;
    document.getElementById("calorieProgressFill").style.width = Math.min(100, (eatenCal / g.calorieGoal) * 100) + "%";
    const calLeft = Math.max(0, g.calorieGoal - eatenCal);
    document.getElementById("calorieRemainingText").textContent =
      calLeft === 0 ? "Surplus target hit for today 🎉" : `${calLeft} kcal left to hit today's surplus`;

    document.getElementById("proteinEatenToday").textContent = eatenProtein;
    document.getElementById("proteinGoalDisplay").textContent = g.proteinGoal;
    document.getElementById("proteinProgressFill").style.width = Math.min(100, (eatenProtein / g.proteinGoal) * 100) + "%";

    document.getElementById("carbsEatenToday").textContent = eatenCarbs;
    document.getElementById("carbsGoalDisplay").textContent = g.carbsGoal;
    document.getElementById("carbsProgressFill").style.width = Math.min(100, (eatenCarbs / g.carbsGoal) * 100) + "%";

    document.getElementById("fatsEatenToday").textContent = eatenFats;
    document.getElementById("fatsGoalDisplay").textContent = g.fatsGoal;
    document.getElementById("fatsProgressFill").style.width = Math.min(100, (eatenFats / g.fatsGoal) * 100) + "%";

    document.getElementById("waterCountToday").textContent = water;
    document.getElementById("waterGoalDisplay").textContent = WATER_GOAL_GLASSES;
    document.getElementById("waterMlToday").textContent = water * GLASS_ML;
    document.getElementById("waterGoalMl").textContent = WATER_GOAL_GLASSES * GLASS_ML;
    document.getElementById("waterProgressFill").style.width = Math.min(100, (water / WATER_GOAL_GLASSES) * 100) + "%";

    const lastSleep = getLastSleepEntry();
    const sleepHours = lastSleep ? lastSleep.hours : 0;
    document.getElementById("sleepHoursToday").textContent = sleepHours.toFixed(1);
    document.getElementById("sleepGoalDisplay").textContent = profile.sleepGoal;
    document.getElementById("sleepProgressFill").style.width = Math.min(100, (sleepHours / profile.sleepGoal) * 100) + "%";

    const tips = [
      "Small appetite, frequent plate: aim for 5–6 smaller meals instead of 3 big ones today.",
      "Drink your calories too — milk, peanut butter shakes and smoothies go down easier than a full plate.",
      "Keep a glass of water within arm's reach — sipping through the day beats forcing it all at once.",
      "Add a spoon of ghee, peanut butter or olive oil to meals — an easy way to raise calories without more volume.",
      "Rice, roti, oats and fruit are cheap, easy carbs — don't skip them chasing protein alone.",
      "A consistent bedtime does as much for your appetite the next day as the food itself."
    ];
    document.getElementById("tipText").textContent = tips[diffDays % tips.length];
  }

  function dayDiff(dateKeyA, dateKeyB) {
    const a = new Date(dateKeyA + "T00:00:00");
    const b = new Date(dateKeyB + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  /* ============ Food tracker ============ */
  const foodForm = document.getElementById("foodForm");
  const foodEntryList = document.getElementById("foodEntryList");

  function renderFoodList() {
    renderDateNav("food");
    const food = load(foodKey(viewDate), []);
    const g = computeGoals(profile);
    const eatenCal = food.reduce((s, f) => s + f.calories, 0);
    const eatenProtein = food.reduce((s, f) => s + (f.protein || 0), 0);
    const eatenCarbs = food.reduce((s, f) => s + (f.carbs || 0), 0);
    const eatenFats = food.reduce((s, f) => s + (f.fats || 0), 0);

    document.getElementById("foodScreenEaten").textContent = eatenCal;
    document.getElementById("foodScreenGoal").textContent = g.calorieGoal;
    document.getElementById("foodScreenProtein").textContent = eatenProtein;
    document.getElementById("foodScreenCarbs").textContent = eatenCarbs;
    document.getElementById("foodScreenFats").textContent = eatenFats;
    document.getElementById("foodScreenProgressFill").style.width = Math.min(100, (eatenCal / g.calorieGoal) * 100) + "%";

    if (food.length === 0) {
      const dayWord = viewDate === appDayKey() ? "today" : "on " + formatDateLabel(viewDate).toLowerCase();
      foodEntryList.innerHTML = `<li class="empty-state">Nothing logged ${dayWord}. Add a meal above.</li>`;
      return;
    }
    foodEntryList.innerHTML = food.map((f, i) => `
      <li class="entry-row">
        <div>
          <div class="entry-name">${escapeHtml(f.name)}</div>
          <div class="entry-meta">${f.calories} kcal${f.protein ? " · " + f.protein + "g protein" : ""}${f.carbs ? " · " + f.carbs + "g carbs" : ""}${f.fats ? " · " + f.fats + "g fats" : ""}</div>
        </div>
        <button class="entry-remove" data-index="${i}" aria-label="Remove entry">✕</button>
      </li>
    `).join("");

    foodEntryList.querySelectorAll(".entry-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        const list = load(foodKey(viewDate), []);
        list.splice(idx, 1);
        save(foodKey(viewDate), list);
        renderFoodList();
        renderDashboard();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  foodForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("foodName").value.trim();
    const calories = Number(document.getElementById("foodCalories").value);
    const protein = Number(document.getElementById("foodProtein").value) || 0;
    const carbs = Number(document.getElementById("foodCarbs").value) || 0;
    const fats = Number(document.getElementById("foodFats").value) || 0;
    if (!name || !calories) return;

    const list = load(foodKey(viewDate), []);
    list.push({ name, calories, protein, carbs, fats });
    save(foodKey(viewDate), list);

    foodForm.reset();
    renderFoodList();
    renderDashboard();
  });

  /* ============ Water tracker ============ */
  const RING_CIRC = 2 * Math.PI * 88;

  function renderWater() {
    renderDateNav("water");
    const water = load(waterKey(viewDate), 0);
    document.getElementById("waterDialCount").textContent = water;
    document.getElementById("waterDialGoal").textContent = WATER_GOAL_GLASSES;

    const pct = Math.min(1, water / WATER_GOAL_GLASSES);
    const ring = document.getElementById("waterRingFill");
    ring.style.strokeDasharray = RING_CIRC;
    ring.style.strokeDashoffset = RING_CIRC * (1 - pct);

    const grid = document.getElementById("glassGrid");
    const totalCells = Math.max(WATER_GOAL_GLASSES, water);
    grid.innerHTML = Array.from({ length: totalCells }, (_, i) =>
      `<div class="glass-cell ${i < water ? "filled" : ""}"></div>`
    ).join("");
  }

  function setWater(newVal) {
    const val = Math.max(0, newVal);
    save(waterKey(viewDate), val);
    renderWater();
    renderDashboard();
  }

  document.getElementById("waterPlus").addEventListener("click", () => {
    setWater(load(waterKey(viewDate), 0) + 1);
  });
  document.getElementById("waterMinus").addEventListener("click", () => {
    setWater(load(waterKey(viewDate), 0) - 1);
  });
  document.getElementById("waterUndo").addEventListener("click", () => {
    setWater(load(waterKey(viewDate), 0) - 1);
  });

  /* ============ Sleep tracker ============ */
  const sleepForm = document.getElementById("sleepForm");
  const sleepEntryList = document.getElementById("sleepEntryList");

  function getSleepLog() { return load(K_SLEEPLOG, []); }

  function computeSleepHours(bedtime, waketime) {
    const [bh, bm] = bedtime.split(":").map(Number);
    const [wh, wm] = waketime.split(":").map(Number);
    let bedMinutes = bh * 60 + bm;
    let wakeMinutes = wh * 60 + wm;
    if (wakeMinutes <= bedMinutes) wakeMinutes += 24 * 60; // overnight wrap
    return (wakeMinutes - bedMinutes) / 60;
  }

  function getLastSleepEntry() {
    const log = getSleepLog();
    if (log.length === 0) return null;
    return log[log.length - 1];
  }

  function getSleepEntryForDay(day) {
    return getSleepLog().find((l) => l.day === day) || null;
  }

  sleepForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const bedtime = document.getElementById("sleepBedtime").value;
    const waketime = document.getElementById("sleepWaketime").value;
    if (!bedtime || !waketime) return;
    const hours = computeSleepHours(bedtime, waketime);

    const log = getSleepLog();
    const day = viewDate;
    const existingIdx = log.findIndex((l) => l.day === day);
    const entry = { day, bedtime, waketime, hours };
    if (existingIdx >= 0) log[existingIdx] = entry;
    else log.push(entry);
    log.sort((a, b) => a.day.localeCompare(b.day));
    save(K_SLEEPLOG, log);

    sleepForm.reset();
    renderSleep();
    renderDashboard();
  });

  function renderSleep() {
    renderDateNav("sleep");
    const entry = getSleepEntryForDay(viewDate);
    const hours = entry ? entry.hours : 0;
    document.getElementById("sleepScreenHours").textContent = hours.toFixed(1);
    document.getElementById("sleepScreenGoal").textContent = profile.sleepGoal;
    document.getElementById("sleepScreenProgressFill").style.width = Math.min(100, (hours / profile.sleepGoal) * 100) + "%";
    document.getElementById("sleepBedtime").value = entry ? entry.bedtime : "";
    document.getElementById("sleepWaketime").value = entry ? entry.waketime : "";
    document.getElementById("sleepScreenDayLabel").textContent =
      viewDate === appDayKey() ? "last night" : "night of " + formatDateLabel(viewDate).toLowerCase();

    const log = getSleepLog().slice().reverse().slice(0, 14);
    if (log.length === 0) {
      sleepEntryList.innerHTML = `<li class="empty-state">No sleep logged yet. Add last night's bedtime and wake time above.</li>`;
      return;
    }
    sleepEntryList.innerHTML = log.map((e) => `
      <li class="entry-row">
        <div>
          <div class="entry-name">${e.hours.toFixed(1)}h sleep</div>
          <div class="entry-meta">${e.bedtime} → ${e.waketime} · ${formatDate(e.day)}</div>
        </div>
      </li>
    `).join("");
  }

  /* ============ Weight progress ============ */
  const weightForm = document.getElementById("weightForm");
  const weightEntryList = document.getElementById("weightEntryList");

  function getWeightLog() { return load(K_WEIGHTLOG, []); }

  weightForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = Number(document.getElementById("weightInput").value);
    if (!val) return;
    const log = getWeightLog();
    const day = appDayKey();
    const existingIdx = log.findIndex((l) => l.date === day);
    if (existingIdx >= 0) log[existingIdx].weight = val;
    else log.push({ date: day, weight: val });
    log.sort((a, b) => a.date.localeCompare(b.date));
    save(K_WEIGHTLOG, log);

    profile.weight = val;
    save(K_PROFILE, profile);

    weightForm.reset();
    renderAll();
  });

  function renderWeightList() {
    const log = getWeightLog().slice().reverse();
    if (log.length === 0) {
      weightEntryList.innerHTML = `<li class="empty-state">No weigh-ins yet. Log today's weight above to start your trend.</li>`;
      return;
    }
    weightEntryList.innerHTML = log.map((entry) => `
      <li class="entry-row">
        <div>
          <div class="entry-name">${entry.weight.toFixed(1)} kg</div>
          <div class="entry-meta">${formatDate(entry.date)}</div>
        </div>
      </li>
    `).join("");
  }

  function formatDate(d) {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderWeightChart() {
    const svg = document.getElementById("weightChart");
    const log = getWeightLog();
    const summaryEl = document.getElementById("progressSummary");

    if (log.length === 0) {
      svg.innerHTML = `<text x="160" y="80" text-anchor="middle" font-size="12" fill="#a29e93">Log a weigh-in to see your trend</text>`;
      summaryEl.innerHTML = "";
      return;
    }

    const weights = log.map((l) => l.weight);
    const minW = Math.min(...weights, profile.weight) - 1;
    const maxW = Math.max(...weights, profile.target) + 1;
    const w = 320, h = 160, padX = 24, padY = 20;

    const xFor = (i) => padX + (i / Math.max(1, log.length - 1)) * (w - padX * 2);
    const yFor = (val) => h - padY - ((val - minW) / (maxW - minW)) * (h - padY * 2);

    const targetY = yFor(profile.target).toFixed(1);
    const points = log.map((l, i) => `${xFor(i).toFixed(1)},${yFor(l.weight).toFixed(1)}`).join(" ");
    const dots = log.map((l, i) =>
      `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(l.weight).toFixed(1)}" r="3.5" fill="#ff4d5e" />`
    ).join("");

    svg.innerHTML = `
      <line x1="${padX}" y1="${targetY}" x2="${w - padX}" y2="${targetY}" stroke="#ffb020" stroke-width="1.5" stroke-dasharray="4 4" />
      <text x="${w - padX}" y="${Number(targetY) - 5}" text-anchor="end" font-size="9" fill="#c98600">target ${profile.target}kg</text>
      <polyline points="${points}" fill="none" stroke="#ff4d5e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
    `;

    const first = log[0].weight;
    const last = log[log.length - 1].weight;
    const gained = (last - first).toFixed(1);
    const toGo = Math.max(0, profile.target - last).toFixed(1);

    summaryEl.innerHTML = `
      <div class="summary-pill"><span class="val">${gained >= 0 ? "+" : ""}${gained} kg</span><span class="lab">since day 1</span></div>
      <div class="summary-pill"><span class="val">${toGo} kg</span><span class="lab">left to goal</span></div>
      <div class="summary-pill"><span class="val">${log.length}</span><span class="lab">weigh-ins logged</span></div>
    `;
  }

  /* ============ Alarms ============ */
  function saveAlarms() { save(K_ALARMS, alarms); }

  function initAlarmUI() {
    const foodEnabled = document.getElementById("foodAlarmEnabled");
    const foodTime = document.getElementById("foodAlarmTime");
    const waterEnabled = document.getElementById("waterAlarmEnabled");
    const waterInterval = document.getElementById("waterAlarmInterval");
    const bedtimeEnabled = document.getElementById("bedtimeAlarmEnabled");
    const bedtimeTime = document.getElementById("bedtimeAlarmTime");
    const wakeEnabled = document.getElementById("wakeAlarmEnabled");
    const wakeTime = document.getElementById("wakeAlarmTime");

    foodEnabled.checked = alarms.food.enabled;
    foodTime.value = alarms.food.time;
    waterEnabled.checked = alarms.water.enabled;
    waterInterval.value = alarms.water.intervalHours;
    bedtimeEnabled.checked = alarms.bedtime.enabled;
    bedtimeTime.value = alarms.bedtime.time;
    wakeEnabled.checked = alarms.wake.enabled;
    wakeTime.value = alarms.wake.time;

    function maybeRequestPermission() {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    foodEnabled.addEventListener("change", () => {
      alarms.food.enabled = foodEnabled.checked;
      saveAlarms();
      if (foodEnabled.checked) maybeRequestPermission();
    });
    foodTime.addEventListener("change", () => { alarms.food.time = foodTime.value; saveAlarms(); });

    waterEnabled.addEventListener("change", () => {
      alarms.water.enabled = waterEnabled.checked;
      alarms.water.lastFiredAt = Date.now();
      saveAlarms();
      if (waterEnabled.checked) maybeRequestPermission();
    });
    waterInterval.addEventListener("change", () => {
      alarms.water.intervalHours = Math.max(1, Number(waterInterval.value) || 2);
      saveAlarms();
    });

    bedtimeEnabled.addEventListener("change", () => {
      alarms.bedtime.enabled = bedtimeEnabled.checked;
      saveAlarms();
      if (bedtimeEnabled.checked) maybeRequestPermission();
    });
    bedtimeTime.addEventListener("change", () => { alarms.bedtime.time = bedtimeTime.value; saveAlarms(); });

    wakeEnabled.addEventListener("change", () => {
      alarms.wake.enabled = wakeEnabled.checked;
      saveAlarms();
      if (wakeEnabled.checked) maybeRequestPermission();
    });
    wakeTime.addEventListener("change", () => { alarms.wake.time = wakeTime.value; saveAlarms(); });
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      osc.onended = () => ctx.close();
    } catch (e) { /* audio not available */ }
  }

  const alarmToast = document.getElementById("alarmToast");
  const alarmToastText = document.getElementById("alarmToastText");
  document.getElementById("alarmToastDismiss").addEventListener("click", () => {
    alarmToast.classList.remove("show");
  });

  function fireAlarm(title, body) {
    beep();
    alarmToastText.textContent = body;
    alarmToast.classList.add("show");
    setTimeout(() => alarmToast.classList.remove("show"), 12000);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch (e) {}
    }
  }

  let lastFiredMinuteKey = {};
  function checkAlarms() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const nowTime = `${hh}:${mm}`;
    const minuteStamp = `${appDayKey()}_${nowTime}`;

    if (alarms.food.enabled && alarms.food.time === nowTime && lastFiredMinuteKey.food !== minuteStamp) {
      lastFiredMinuteKey.food = minuteStamp;
      fireAlarm("GAINLINE — Meal reminder", "Time to log a meal and keep the surplus going.");
    }
    if (alarms.bedtime.enabled && alarms.bedtime.time === nowTime && lastFiredMinuteKey.bedtime !== minuteStamp) {
      lastFiredMinuteKey.bedtime = minuteStamp;
      fireAlarm("GAINLINE — Bedtime", "Wind down — consistent sleep supports your gains.");
    }
    if (alarms.wake.enabled && alarms.wake.time === nowTime && lastFiredMinuteKey.wake !== minuteStamp) {
      lastFiredMinuteKey.wake = minuteStamp;
      fireAlarm("GAINLINE — Wake up", "Good morning — log last night's sleep and weigh in.");
    }
    if (alarms.water.enabled) {
      const last = alarms.water.lastFiredAt || 0;
      const intervalMs = (alarms.water.intervalHours || 2) * 3600 * 1000;
      if (Date.now() - last >= intervalMs) {
        alarms.water.lastFiredAt = Date.now();
        saveAlarms();
        fireAlarm("GAINLINE — Water reminder", "Time for a glass of water.");
      }
    }
  }
  setInterval(checkAlarms, 20000);

  /* ============ Daily rollover watcher ============ */
  // If the tab stays open across the 6 AM IST boundary, refresh views automatically.
  let currentAppDay = appDayKey();
  setInterval(() => {
    const nowDay = appDayKey();
    if (nowDay !== currentAppDay) {
      currentAppDay = nowDay;
      renderAll();
    }
  }, 30000);

  /* ============ Render all ============ */
  function renderAll() {
    renderDashboard();
    renderFoodList();
    renderWater();
    renderSleep();
    renderWeightList();
    renderWeightChart();
  }

  initAlarmUI();
  renderAll();
})();
