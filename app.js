(() => {
  "use strict";

  /* ============ Storage keys & helpers ============ */
  const K_PROFILE = "gainline_profile";
  const K_START = "gainline_start_date";
  const K_WEIGHTLOG = "gainline_weight_log";
  const foodKey = (d) => `gainline_food_${d}`;
  const waterKey = (d) => `gainline_water_${d}`;

  const todayStr = () => new Date().toISOString().slice(0, 10);

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
    activity: 1.375
  };

  const WATER_GOAL_GLASSES = 10; // ~2500ml, standard daily hydration target
  const GLASS_ML = 250;

  let profile = load(K_PROFILE, DEFAULT_PROFILE);
  if (!load(K_START, null)) save(K_START, todayStr());

  /* ============ Derived goals ============ */
  function computeGoals(p) {
    const heightM = p.height / 100;
    const bmi = p.weight / (heightM * heightM);

    let bmiCategory, bmiColorNote;
    if (bmi < 18.5) { bmiCategory = "Underweight — building a surplus will help"; }
    else if (bmi < 25) { bmiCategory = "Healthy range — keep building steadily"; }
    else if (bmi < 30) { bmiCategory = "Overweight range"; }
    else { bmiCategory = "Obese range"; }

    // Mifflin-St Jeor (male assumption, adjust if needed)
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
    const tdee = bmr * Number(p.activity);
    const calorieGoal = Math.round((tdee + 500) / 10) * 10;
    const proteinGoal = Math.round(p.weight * 1.8);

    return { bmi, bmiCategory, bmr, tdee, calorieGoal, proteinGoal };
  }

  /* ============ Navigation ============ */
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

    const start = new Date(load(K_START, todayStr()));
    const diffDays = Math.max(1, Math.floor((new Date(todayStr()) - start) / 86400000) + 1);
    document.getElementById("dayStreak").textContent = diffDays;

    document.getElementById("bmiValue").textContent = g.bmi.toFixed(1);
    document.getElementById("bmiCategory").textContent = g.bmiCategory;
    const markerPct = Math.min(100, Math.max(0, (g.bmi / 40) * 100));
    document.getElementById("bmiScaleMarker").style.left = markerPct + "%";

    const food = load(foodKey(todayStr()), []);
    const water = load(waterKey(todayStr()), 0);
    const eatenCal = food.reduce((s, f) => s + f.calories, 0);
    const eatenProtein = food.reduce((s, f) => s + (f.protein || 0), 0);

    document.getElementById("caloriesEatenToday").textContent = eatenCal;
    document.getElementById("calorieGoalDisplay").textContent = g.calorieGoal;
    const calPct = Math.min(100, (eatenCal / g.calorieGoal) * 100);
    document.getElementById("calorieProgressFill").style.width = calPct + "%";
    const calLeft = Math.max(0, g.calorieGoal - eatenCal);
    document.getElementById("calorieRemainingText").textContent =
      calLeft === 0 ? "Surplus target hit for today 🎉" : `${calLeft} kcal left to hit today's surplus`;

    document.getElementById("proteinEatenToday").textContent = eatenProtein;
    document.getElementById("proteinGoalDisplay").textContent = g.proteinGoal;
    document.getElementById("proteinProgressFill").style.width =
      Math.min(100, (eatenProtein / g.proteinGoal) * 100) + "%";

    document.getElementById("waterCountToday").textContent = water;
    document.getElementById("waterGoalDisplay").textContent = WATER_GOAL_GLASSES;
    document.getElementById("waterMlToday").textContent = water * GLASS_ML;
    document.getElementById("waterGoalMl").textContent = WATER_GOAL_GLASSES * GLASS_ML;
    document.getElementById("waterProgressFill").style.width =
      Math.min(100, (water / WATER_GOAL_GLASSES) * 100) + "%";

    const tips = [
      "Small appetite, frequent plate: aim for 5–6 smaller meals instead of 3 big ones today.",
      "Drink your calories too — milk, peanut butter shakes and smoothies go down easier than a full plate.",
      "Keep a glass of water within arm's reach — sipping through the day beats forcing it all at once.",
      "Add a spoon of ghee, peanut butter or olive oil to meals — an easy way to raise calories without more volume.",
      "Weigh in at the same time each morning for the most consistent progress reading."
    ];
    document.getElementById("tipText").textContent = tips[diffDays % tips.length];
  }

  /* ============ Food tracker ============ */
  const foodForm = document.getElementById("foodForm");
  const foodEntryList = document.getElementById("foodEntryList");

  function renderFoodList() {
    const food = load(foodKey(todayStr()), []);
    const g = computeGoals(profile);
    const eatenCal = food.reduce((s, f) => s + f.calories, 0);
    const eatenProtein = food.reduce((s, f) => s + (f.protein || 0), 0);

    document.getElementById("foodScreenEaten").textContent = eatenCal;
    document.getElementById("foodScreenGoal").textContent = g.calorieGoal;
    document.getElementById("foodScreenProtein").textContent = eatenProtein;
    document.getElementById("foodScreenProgressFill").style.width =
      Math.min(100, (eatenCal / g.calorieGoal) * 100) + "%";

    if (food.length === 0) {
      foodEntryList.innerHTML = `<li class="empty-state">Nothing logged yet today. Add your first meal above.</li>`;
      return;
    }
    foodEntryList.innerHTML = food.map((f, i) => `
      <li class="entry-row">
        <div>
          <div class="entry-name">${escapeHtml(f.name)}</div>
          <div class="entry-meta">${f.calories} kcal${f.protein ? " · " + f.protein + "g protein" : ""}</div>
        </div>
        <button class="entry-remove" data-index="${i}" aria-label="Remove entry">✕</button>
      </li>
    `).join("");

    foodEntryList.querySelectorAll(".entry-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        const list = load(foodKey(todayStr()), []);
        list.splice(idx, 1);
        save(foodKey(todayStr()), list);
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
    if (!name || !calories) return;

    const list = load(foodKey(todayStr()), []);
    list.push({ name, calories, protein });
    save(foodKey(todayStr()), list);

    foodForm.reset();
    renderFoodList();
    renderDashboard();
  });

  /* ============ Water tracker ============ */
  const RING_CIRC = 2 * Math.PI * 88;

  function renderWater() {
    const water = load(waterKey(todayStr()), 0);
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
    save(waterKey(todayStr()), val);
    renderWater();
    renderDashboard();
  }

  document.getElementById("waterPlus").addEventListener("click", () => {
    setWater(load(waterKey(todayStr()), 0) + 1);
  });
  document.getElementById("waterMinus").addEventListener("click", () => {
    setWater(load(waterKey(todayStr()), 0) - 1);
  });
  document.getElementById("waterUndo").addEventListener("click", () => {
    setWater(load(waterKey(todayStr()), 0) - 1);
  });

  /* ============ Weight progress ============ */
  const weightForm = document.getElementById("weightForm");
  const weightEntryList = document.getElementById("weightEntryList");

  function getWeightLog() {
    return load(K_WEIGHTLOG, []);
  }

  weightForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = Number(document.getElementById("weightInput").value);
    if (!val) return;
    const log = getWeightLog();
    const today = todayStr();
    const existingIdx = log.findIndex((l) => l.date === today);
    if (existingIdx >= 0) log[existingIdx].weight = val;
    else log.push({ date: today, weight: val });
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

  /* ============ Render all ============ */
  function renderAll() {
    renderDashboard();
    renderFoodList();
    renderWater();
    renderWeightList();
    renderWeightChart();
  }

  renderAll();
})();
