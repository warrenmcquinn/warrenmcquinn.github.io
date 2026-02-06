(() => {
  const root = document.documentElement;

  const themeToggle = document.getElementById("themeToggle");
  const castBtn = document.getElementById("castBtn");
  const castNote = document.getElementById("castNote");
  const hook = document.getElementById("hook");
  const rigEl = document.getElementById("rig");
  const lineEl = rigEl?.querySelector(".line") || document.querySelector(".line");
  const fishLogEl = document.getElementById("fishLog");
  const lastCatchEl = document.getElementById("lastCatch");
  const caughtFishEl = document.getElementById("caughtFish");
  const reelPad = document.getElementById("reelPad");
  const waterlineEl = document.querySelector(".waterline");
  const bg = document.getElementById("bg");
  const year = document.getElementById("year");

  function hexToRgb(hex) {
    const h = hex.replace("#", "").trim();
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b };
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { r, g, b };
    }
    return { r: 255, g: 255, b: 255 };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function mixRgb(a, b, t) {
    return {
      r: Math.round(lerp(a.r, b.r, t)),
      g: Math.round(lerp(a.g, b.g, t)),
      b: Math.round(lerp(a.b, b.b, t)),
    };
  }

  const SPECIES = [
    {
      key: "porgy",
      label: "Porgy",
      len: 0.92,
      wid: 1.05,
      tail: 0.9,
      stripe: 0.3,
      tint: { r: 210, g: 220, b: 232 },
      tintMix: 0.55,
    },
    {
      key: "red_snapper",
      label: "Red snapper",
      len: 1.02,
      wid: 0.95,
      tail: 1.0,
      stripe: 0.12,
      tint: { r: 255, g: 124, b: 112 },
      tintMix: 0.68,
    },
    {
      key: "triggerfish",
      label: "Triggerfish",
      len: 0.86,
      wid: 1.15,
      tail: 0.7,
      stripe: 0.55,
      tint: { r: 242, g: 238, b: 224 },
      tintMix: 0.62,
    },
    {
      key: "african_pompano",
      label: "African pompano",
      len: 0.96,
      wid: 1.0,
      tail: 1.08,
      stripe: 0.45,
      tint: { r: 245, g: 214, b: 120 },
      tintMix: 0.62,
    },
    {
      key: "red_grouper",
      label: "Red grouper",
      len: 1.08,
      wid: 1.08,
      tail: 0.72,
      stripe: 0.18,
      tint: { r: 255, g: 142, b: 124 },
      tintMix: 0.62,
    },
    {
      key: "gag_grouper",
      label: "Gag grouper",
      len: 1.1,
      wid: 1.1,
      tail: 0.74,
      stripe: 0.1,
      tint: { r: 170, g: 206, b: 170 },
      tintMix: 0.55,
    },
  ];

  const GIANT_SPECIES = [
    {
      key: "goliath_grouper",
      label: "Goliath grouper",
      len: 1.22,
      wid: 1.24,
      tail: 0.62,
      stripe: 0.08,
      tint: { r: 170, g: 178, b: 150 },
      tintMix: 0.45,
    },
  ];

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function getPalette() {
    const styles = getComputedStyle(root);
    const accent = styles.getPropertyValue("--accent").trim() || "#ff3b3b";
    const accent2 = styles.getPropertyValue("--accent2").trim() || "#2f7bff";
    return { a: hexToRgb(accent), b: hexToRgb(accent2) };
  }

  function createBackground() {
    if (!bg) return null;
    const ctx = bg.getContext("2d", { alpha: true });
    if (!ctx) return null;

    let palette = getPalette();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let running = false;
    let particles = [];
    let giants = [];
    let pointerX = 0.5;
    let pointerY = 0.5;
    let bait = null;
    let caughtIndex = -1;
    let caughtGiantIndex = -1;
    let biteListener = null;
    let hasBitten = false;
    let biteEnabled = true;

    function sizeCanvas() {
      const vv = window.visualViewport;
      const cssWidth = Math.max(320, vv?.width || window.innerWidth || 0);
      const cssHeight = Math.max(320, vv?.height || window.innerHeight || 0);
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      width = Math.floor(cssWidth * dpr);
      height = Math.floor(cssHeight * dpr);
      bg.width = width;
      bg.height = height;
      bg.style.width = `${cssWidth}px`;
      bg.style.height = `${cssHeight}px`;

      const area = cssWidth * cssHeight;
      const count = Math.max(26, Math.min(72, Math.round(area / 32000)));
      const surfaceY = cssHeight * 0.32;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * cssWidth,
        y: surfaceY + 12 + Math.random() * (cssHeight - surfaceY - 24),
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.2,
        s: Math.random() * 1000,
        r: 1.2 + Math.random() * 1.2,
        flip: Math.random() < 0.5 ? -1 : 1,
        species: pick(SPECIES),
        fade: Math.random() * Math.PI * 2,
      }));

      const giantCount = Math.max(
        1,
        Math.min(5, Math.round(Math.sqrt(area) / 520))
      );
      giants = Array.from({ length: giantCount }, () => {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const size = 6 + Math.random() * 6;
        const species = pick(GIANT_SPECIES);
        return {
          x: dir > 0 ? -120 - Math.random() * cssWidth : cssWidth + 120 + Math.random() * cssWidth,
          y: surfaceY + (cssHeight - surfaceY) * (0.6 + Math.random() * 0.35),
          vx: dir * (0.16 + Math.random() * 0.28),
          vy: (Math.random() - 0.5) * 0.002,
          s: Math.random() * 1000,
          r: size,
          dir,
          species,
          fade: Math.random() * Math.PI * 2,
        };
      });
    }

    function fieldAngle(x, y, t, s) {
      const nx = x * 0.0021;
      const ny = y * 0.0021;
      const tt = (t + s) * 0.00015;
      const px = (pointerX - 0.5) * 0.9;
      const a = Math.sin((nx * 2.1 + tt) * Math.PI * 2);
      const b = Math.cos((ny * 1.7 - tt) * Math.PI * 2);
      const c = Math.sin((nx * 1.1 + ny * 1.3 + tt + px * 0.08) * Math.PI * 2);
      return Math.atan2(b + c * 0.55, a + c * 0.55);
    }

    function step(dt, t) {
      const cssW = width / dpr;
      const cssH = height / dpr;
      const surfaceY = cssH * 0.32;

      for (let i = 0; i < giants.length; i += 1) {
        const g = giants[i];
        if (bait && i === caughtGiantIndex) {
          g.x = lerp(g.x, bait.x, 0.08);
          g.y = lerp(g.y, bait.y, 0.08);
          g.vx *= 0.88;
          g.vy *= 0.88;
          continue;
        }

        g.x += g.vx * (dt * 0.06);
        g.y += Math.sin((t + g.s) * 0.0006) * 0.04 + g.vy * dt;

        if (g.dir > 0 && g.x > cssW + 140) g.x = -140;
        else if (g.dir < 0 && g.x < -140) g.x = cssW + 140;

        if (g.y < surfaceY + 44) g.y = surfaceY + 44;
        else if (g.y > cssH - 26) g.y = cssH - 26;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        if (bait && i === caughtIndex) {
          const tx = bait.x;
          const ty = bait.y;
          p.x = lerp(p.x, tx, 0.25);
          p.y = lerp(p.y, ty, 0.25);
          p.vx *= 0.85;
          p.vy *= 0.85;
          continue;
        }

        const ang = fieldAngle(p.x, p.y, t, p.s);
        const ax = Math.cos(ang);
        const ay = Math.sin(ang);

        const drift = 0.16 * p.flip;
        p.vx = p.vx * 0.93 + ax * 0.12 + drift;
        p.vy = p.vy * 0.93 + ay * 0.08;

        if (bait) {
          const dx = bait.x - p.x;
          const dy = bait.y - p.y;
          const d2 = dx * dx + dy * dy;
          const pull = Math.max(0, 1 - d2 / (220 * 220));
          p.vx += dx * pull * 0.0009;
          p.vy += dy * pull * 0.0009;
        }

        p.x += p.vx * (dt * 0.06);
        p.y += p.vy * (dt * 0.06);

        if (p.x < -40) p.x = cssW + 40;
        else if (p.x > cssW + 40) p.x = -40;

        if (p.y < surfaceY + 10) p.y = surfaceY + 10;
        else if (p.y > cssH + 30) p.y = surfaceY + 20;
      }

      if (
        bait &&
        biteEnabled &&
        caughtIndex < 0 &&
        caughtGiantIndex < 0
      ) {
        const biteDist = 18;
        const biteDist2 = biteDist * biteDist;
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const dx = bait.x - p.x;
          const dy = bait.y - p.y;
          if (dx * dx + dy * dy < biteDist2) {
            caughtIndex = i;
            if (!hasBitten) {
              hasBitten = true;
              const speed = Math.hypot(p.vx, p.vy);
              const depthFt = Math.max(0, (bait.y - surfaceY) / 12);
              const lengthIn = Math.round(10 + p.r * 8);
              biteListener?.({
                kind: "school",
                speciesKey: p.species?.key || "",
                species: p.species?.label || "Fish",
                tint: p.species?.tint || null,
                depthFt,
                lengthIn,
                speed,
              });
            }
            break;
          }
        }

        if (caughtIndex < 0) {
          const deepEnough = bait.y - surfaceY > 110;
          if (deepEnough) {
            const giantDist = 34;
            const giantDist2 = giantDist * giantDist;
            for (let i = 0; i < giants.length; i += 1) {
              const g = giants[i];
              const dx = bait.x - g.x;
              const dy = bait.y - g.y;
              if (dx * dx + dy * dy < giantDist2) {
                caughtGiantIndex = i;
                if (!hasBitten) {
                  hasBitten = true;
                  const speed = Math.abs(g.vx);
                  const depthFt = Math.max(0, (bait.y - surfaceY) / 12);
                  const lengthIn = Math.round(22 + g.r * 6);
                  biteListener?.({
                    kind: "giant",
                    speciesKey: g.species?.key || "",
                    species: g.species?.label || "Grouper",
                    tint: g.species?.tint || null,
                    depthFt,
                    lengthIn,
                    speed,
                  });
                }
                break;
              }
            }
          }
        }
      }
    }

    function drawFish(x, y, vx, vy, size, species, paletteMix, depth, alpha, t) {
      const ang = Math.atan2(vy, vx);
      const traits = species || pick(SPECIES);
      const len = (10 + size * 4) * (traits.len || 1);
      const wid = (5 + size * 2.2) * (traits.wid || 1);
      const tailMul = traits.tail || 1;

      const a = palette.a;
      const b = palette.b;
      const base = mixRgb(a, b, paletteMix);
      const tintMix = typeof traits.tintMix === "number" ? traits.tintMix : 0.55;
      const tint = traits.tint ? mixRgb(base, traits.tint, tintMix) : base;

      const fade = 0.16 + 0.84 * (0.5 + 0.5 * Math.sin(t * 0.00032));
      const shimmer = 0.85 + 0.15 * Math.sin(t * 0.0009 + depth * 2.2);
      const vis = alpha * fade * shimmer;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);

      ctx.globalAlpha = vis;
      ctx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 1)`;

      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.48, wid * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      if ((traits.stripe || 0) > 0.15) {
        ctx.globalAlpha = vis * 0.65;
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.beginPath();
        ctx.ellipse(len * 0.06, 0, len * 0.18, wid * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(-len * 0.52, 0);
      ctx.lineTo(-len * (0.72 + 0.22 * tailMul), wid * 0.36);
      ctx.lineTo(-len * (0.72 + 0.22 * tailMul), -wid * 0.36);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function render(t) {
      const cssW = width / dpr;
      const cssH = height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const surfaceY = cssH * 0.32;
      ctx.globalCompositeOperation = "lighter";

      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(0, surfaceY, cssW, cssH - surfaceY);

      ctx.globalCompositeOperation = "source-over";
      for (const g of giants) {
        const depth = Math.max(
          0,
          Math.min(1, (g.y - surfaceY) / (cssH - surfaceY))
        );
        const mix = Math.max(0, Math.min(1, 0.25 + depth * 0.75));
        const alpha = 0.012 + depth * 0.035;
        drawFish(g.x, g.y, g.vx, 0, g.r, g.species, mix, depth, alpha, t + g.fade * 1000);
      }

      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const depth = Math.max(0, Math.min(1, (p.y - surfaceY) / (cssH - surfaceY)));
        const mix = Math.max(0, Math.min(1, 0.12 + depth * 0.88));
        const alpha = 0.03 + depth * 0.11;
        drawFish(
          p.x,
          p.y,
          p.vx,
          p.vy,
          p.r,
          p.species,
          mix,
          depth,
          alpha,
          t + p.fade * 1000
        );
      }

      if (bait) {
        const color = mixRgb(palette.a, palette.b, 0.85);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.10)`;
        ctx.beginPath();
        ctx.arc(bait.x, bait.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    }

    function frame(now) {
      if (!running) return;
      if (document.hidden) {
        last = now;
        raf = window.requestAnimationFrame(frame);
        return;
      }

      const dt = Math.min(40, now - last || 16);
      last = now;

      step(dt, now);
      render(now);
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }

    function renderOnce() {
      render(performance.now());
    }

    function updatePalette() {
      palette = getPalette();
      renderOnce();
    }

    function init() {
      sizeCanvas();
      renderOnce();
    }

    function setPointer(clientX, clientY) {
      const vv = window.visualViewport;
      const cssW = width / dpr || vv?.width || window.innerWidth || 1;
      const cssH = height / dpr || vv?.height || window.innerHeight || 1;
      pointerX = Math.max(0, Math.min(1, clientX / cssW));
      pointerY = Math.max(0, Math.min(1, clientY / cssH));
    }

    function setBait(point) {
      const vv = window.visualViewport;
      const cssW = width / dpr || vv?.width || window.innerWidth || 1;
      const cssH = height / dpr || vv?.height || window.innerHeight || 1;
      const surfaceY = cssH * 0.32;
      bait = {
        x: Math.max(0, Math.min(cssW, point.x)),
        y: Math.max(surfaceY + 14, Math.min(cssH, point.y)),
      };
      caughtIndex = -1;
      caughtGiantIndex = -1;
      hasBitten = false;
    }

    function moveBait(point) {
      if (!bait) return;
      const vv = window.visualViewport;
      const cssW = width / dpr || vv?.width || window.innerWidth || 1;
      const cssH = height / dpr || vv?.height || window.innerHeight || 1;
      const surfaceY = cssH * 0.32;
      bait = {
        x: Math.max(0, Math.min(cssW, point.x)),
        y: Math.max(surfaceY + 14, Math.min(cssH, point.y)),
      };
    }

    function clearBait() {
      bait = null;
      caughtIndex = -1;
      caughtGiantIndex = -1;
      hasBitten = false;
    }

    function onBite(fn) {
      biteListener = fn;
    }

    function setBiteEnabled(enabled) {
      biteEnabled = Boolean(enabled);
    }

    function hasBait() {
      return Boolean(bait);
    }

    return {
      init,
      start,
      stop,
      renderOnce,
      updatePalette,
      resize: sizeCanvas,
      setPointer,
      setBait,
      moveBait,
      clearBait,
      onBite,
      setBiteEnabled,
      hasBait,
    };
  }

  function updateThemeLabel() {
    if (!themeToggle) return;
    const current = root.getAttribute("data-theme") || "dark";
    themeToggle.textContent = `Theme: ${current === "light" ? "Light" : "Dark"}`;
  }

  function setTheme(theme, persist = true) {
    root.setAttribute("data-theme", theme);
    if (persist) localStorage.setItem("theme", theme);
    updateThemeLabel();
    background?.updatePalette?.();
  }

  function toggleTheme() {
    const current = root.getAttribute("data-theme") || "dark";
    setTheme(current === "light" ? "dark" : "light", true);
  }

  function loadTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved, true);
      return;
    }

    const prefersLight =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark", false);
  }

  function hookPoint() {
    if (!hook) return null;
    const rect = hook.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function waterlineY() {
    const rect = waterlineEl?.getBoundingClientRect?.();
    if (rect && Number.isFinite(rect.top)) return rect.top;
    return (window.visualViewport?.height || window.innerHeight || 0) * 0.32;
  }

  function setLineLen(px) {
    const len = Math.max(18, px);
    if (rigEl) rigEl.style.setProperty("--line-len", `${len}px`);
    else if (lineEl) lineEl.style.height = `${len}px`;
  }

  function getLineLen() {
    if (!rigEl) return 26;
    const v = getComputedStyle(rigEl).getPropertyValue("--line-len").trim();
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 26;
  }

  function loadLog() {
    try {
      const raw = localStorage.getItem("fish_log_v1");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveLog(entries) {
    try {
      localStorage.setItem("fish_log_v1", JSON.stringify(entries));
    } catch {
      // ignore
    }
  }

  function renderLog(entries) {
    if (!fishLogEl) return;
    fishLogEl.innerHTML = "";
    if (!entries.length) {
      const li = document.createElement("li");
      li.textContent = "No catches yet.";
      fishLogEl.appendChild(li);
      return;
    }
    for (const e of entries.slice(-6).reverse()) {
      const li = document.createElement("li");
      const kind = e.kind === "giant" ? " · big" : "";
      let when = "";
      if (e.ts) {
        try {
          when =
            " · " +
            new Date(e.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
        } catch {
          when = "";
        }
      }
      const species = e.species ? ` · ${e.species}` : "";
      li.textContent = `#${e.n}${species} · ${e.lengthIn} in · ${e.depthFt.toFixed(
        1
      )} ft${when}${kind}`;
      fishLogEl.appendChild(li);
    }
  }

  function setLastCatch(entry) {
    if (!lastCatchEl) return;
    if (!entry) {
      lastCatchEl.textContent = "";
      document.body.classList.remove("show-last");
      return;
    }
    const kind = entry.kind === "giant" ? " · big" : "";
    const species = entry.species ? `${entry.species}` : "Fish";
    lastCatchEl.textContent = `Last: ${species} · ${entry.lengthIn} in · ${entry.depthFt.toFixed(
      1
    )} ft${kind}`;
    document.body.classList.add("show-last");
  }

  function setCaughtFishStyle(stats) {
    if (!caughtFishEl) return;
    const tint = stats?.tint;
    if (tint && typeof tint.r === "number") {
      const c1 = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.88)`;
      const c2 = `rgba(${Math.max(0, tint.r - 34)}, ${Math.max(
        0,
        tint.g - 34
      )}, ${Math.max(0, tint.b - 34)}, 0.88)`;
      caughtFishEl.style.background = `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), transparent 55%), linear-gradient(90deg, ${c2}, ${c1})`;
      return;
    }
    caughtFishEl.style.background = "";
  }

  function init() {
    if (year) year.textContent = String(new Date().getFullYear());

    background?.init?.();
    loadTheme();
    updateThemeLabel();

    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
    }

    const body = document.body;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    );

    const minLen = 26;
    const dropRate = 260; // px/s
    const reelPxPerRev = 120; // px per full circle
    const motorMax = 92; // px/s
    const motorAccel = 220; // px/s^2

    let pressed = false;
    let reeling = false;
    let lineLen = getLineLen();
    let pendingCatch = null;

    let steer = 0; // -1 left, +1 right
    let boatX = 40;
    let boatV = 0;
    let boatTargetX = null;

    let gameRaf = 0;
    let lastT = 0;

    const log = loadLog();
    renderLog(log);
    setLastCatch(log.length ? log[log.length - 1] : null);

    let landedTimer = 0;
    let reelAngle = null;
    let reelDir = 0;
    let reelCarry = 0;

    let tapStart = null;

    function clamp(n, a, b) {
      return Math.max(a, Math.min(b, n));
    }

    function maxLen() {
      const h = window.innerHeight || 0;
      return Math.max(240, h - waterlineY() + 520);
    }

    function hookInWater(point) {
      return Boolean(point && point.y > waterlineY() + 8);
    }

    function depthFt(point) {
      if (!point) return 0;
      return Math.max(0, (point.y - waterlineY()) / 12);
    }

    function setRigX(px) {
      if (!rigEl) return;
      rigEl.style.setProperty("--rig-x", `${px}px`);
    }

    function setTilts({ lineTiltDeg, rodTiltDeg, rodFlexDeg }) {
      if (!rigEl) return;
      rigEl.style.setProperty("--tilt", `${lineTiltDeg}deg`);
      rigEl.style.setProperty("--rod-tilt", `${rodTiltDeg}deg`);
      rigEl.style.setProperty("--rod-flex", `${rodFlexDeg}deg`);
    }

    function ensureBait({ allowBite }) {
      if (!background) return;
      const p = hookPoint();
      const inWater = hookInWater(p);
      const longEnough = lineLen > minLen + 8;

      if (!p || !inWater || !longEnough) {
        background.clearBait?.();
        background.setBiteEnabled?.(false);
        return;
      }

      background.setBiteEnabled?.(Boolean(allowBite));
      if (background.hasBait?.()) background.moveBait?.(p);
      else background.setBait?.(p);
    }

    function landFish() {
      reeling = false;
      body.classList.remove("bite");
      body.classList.remove("reel-mode");
      background?.clearBait?.();
      background?.setBiteEnabled?.(false);

      if (pendingCatch) {
        const lastN = log.length ? Number(log[log.length - 1].n) || 0 : 0;
        const n = lastN + 1;
        const entry = { n, ts: Date.now(), ...pendingCatch };
        log.push(entry);
        saveLog(log);
        renderLog(log);
        setLastCatch(entry);
        pendingCatch = null;
      }

      body.classList.add("landed");
      if (landedTimer) window.clearTimeout(landedTimer);
      landedTimer = window.setTimeout(() => body.classList.remove("landed"), 4500);
      if (castNote) castNote.textContent = "Nice. Cast again when you like.";
      if (castBtn) castBtn.disabled = false;
    }

    function pressStart() {
      if (!castBtn || !rigEl || reeling) return;
      if (pressed) return;
      pressed = true;
      castBtn.setAttribute("aria-pressed", "true");
      body.classList.add("dropping");
      background?.setBiteEnabled?.(false);
      startGame();
    }

    function pressEnd() {
      if (!castBtn || !rigEl || reeling) return;
      if (!pressed) return;
      pressed = false;
      castBtn.setAttribute("aria-pressed", "false");
      body.classList.remove("dropping");
      ensureBait({ allowBite: true });
      startGame();
    }

    background?.onBite?.((stats) => {
      if (pressed || reeling) return;
      document.body.classList.remove("landed");
      setCaughtFishStyle(stats);
      pendingCatch = {
        kind: stats?.kind || "school",
        species: stats?.species || "",
        speciesKey: stats?.speciesKey || "",
        depthFt: Number(stats?.depthFt) || 0,
        lengthIn: Number(stats?.lengthIn) || 0,
        lineLenPx: Math.round(lineLen),
      };
      body.classList.add("bite");
      body.classList.add("reel-mode");
      if (castNote) castNote.textContent = "Fish on. Circle the button to reel.";
      background?.setBiteEnabled?.(false);
      reeling = true;
      reelAngle = null;
      reelDir = 0;
      reelCarry = 0;
      startGame();
    });

    function bounds() {
      const w = window.visualViewport?.width || window.innerWidth || 0;
      const rigW = rigEl?.getBoundingClientRect?.().width || 160;
      const pad = 10;
      return { min: pad, max: Math.max(pad, w - rigW - pad) };
    }

    function updateMotor(dt, now) {
      if (reduceMotion?.matches) return;
      const { min, max } = bounds();

      if (steer !== 0) {
        boatV += steer * motorAccel * dt;
        boatTargetX = null;
      } else if (boatTargetX != null) {
        const err = boatTargetX - boatX;
        const dir = Math.sign(err);
        boatV += dir * motorAccel * dt;
        if (Math.abs(err) < 8 && Math.abs(boatV) < 12) {
          boatX = boatTargetX;
          boatV = 0;
          boatTargetX = null;
        }
      } else {
        boatV *= Math.max(0, 1 - dt * 7.5);
      }

      boatV = clamp(boatV, -motorMax, motorMax);
      boatX += boatV * dt;

      if (boatX <= min) {
        boatX = min;
        boatV = 0;
      } else if (boatX >= max) {
        boatX = max;
        boatV = 0;
      }

      setRigX(boatX);

      const speed = clamp(boatV / 120, -1, 1);
      const tension = clamp((lineLen - minLen) / (maxLen() - minLen), 0, 1);
      const bite = body.classList.contains("bite");

      const lineTilt = clamp(-3 + speed * 3 + (pressed ? 1 : 0), -10, 10);
      const rodTilt = -18 + tension * 10 + (bite ? 10 : 0) + (reeling ? 8 : 0);
      const rodFlex = -(tension * 6 + (bite ? 8 : 0) + (reeling ? 4 : 0));
      setTilts({ lineTiltDeg: lineTilt, rodTiltDeg: rodTilt, rodFlexDeg: rodFlex });
    }

    function updateLine(dt) {
      if (pressed && !reeling) {
        lineLen = Math.min(maxLen(), lineLen + dropRate * dt);
        setLineLen(lineLen);
      }
    }

    function reelFromPointer(clientX, clientY) {
      if (!reeling || !castBtn) return;
      const rect = castBtn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const r = Math.hypot(dx, dy);
      const btnSize = Math.max(rect.width, rect.height) || 44;
      const minR = Math.max(10, Math.min(26, btnSize * 0.25));
      if (r < minR) return;

      const ang = Math.atan2(dy, dx);
      if (reelAngle == null) {
        reelAngle = ang;
        return;
      }

      let d = ang - reelAngle;
      if (d > Math.PI) d -= Math.PI * 2;
      else if (d < -Math.PI) d += Math.PI * 2;
      reelAngle = ang;
      if (Math.abs(d) < 0.01) return;

      const s = Math.sign(d);
      if (!reelDir) reelDir = s;
      if (s !== reelDir) {
        reelCarry = Math.max(0, reelCarry - Math.abs(d) * 0.6);
        return;
      }

      reelCarry += Math.abs(d);
      const revs = reelCarry / (Math.PI * 2);
      if (revs < 0.02) return;
      reelCarry -= revs * (Math.PI * 2);

      lineLen = Math.max(minLen, lineLen - revs * reelPxPerRev);
      setLineLen(lineLen);
      if (lineLen <= minLen + 0.5) {
        landFish();
        return;
      }

      if (castNote) {
        const pct = Math.max(
          0,
          Math.min(
            100,
            Math.round((1 - (lineLen - minLen) / (maxLen() - minLen)) * 100)
          )
        );
        castNote.textContent = `Reel: ${pct}%`;
      }
    }

    function updateStatus() {
      if (!castNote) return;
      const p = hookPoint();
      const inWater = hookInWater(p);
      const deep = depthFt(p);

      if (reeling) return;
      if (pressed) {
        castNote.textContent = inWater
          ? `Depth: ${deep.toFixed(1)} ft`
          : "Lowering.";
        return;
      }

      if (lineLen <= minLen + 8) {
        castNote.textContent = "Hold to lower. Release to wait.";
        return;
      }

      castNote.textContent = inWater ? "Line’s in. Wait." : "Not in the water.";
    }

    function frame(now) {
      const dt = clamp((now - lastT) / 1000 || 0.016, 0, 0.04);
      lastT = now;

      updateLine(dt);
      updateMotor(dt, now);
      updateStatus();

      const allowBite = !pressed && !reeling;
      ensureBait({ allowBite });

      gameRaf = requestAnimationFrame(frame);
    }

    function startGame() {
      if (gameRaf) return;
      lastT = performance.now();
      gameRaf = requestAnimationFrame(frame);
    }

    function stopGame() {
      if (!gameRaf) return;
      cancelAnimationFrame(gameRaf);
      gameRaf = 0;
    }

    startGame();

    function setSteer(dir) {
      steer = dir;
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") setSteer(-1);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") setSteer(1);
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (steer < 0) setSteer(0);
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (steer > 0) setSteer(0);
      }
    });

    function startTap(e) {
      if (pressed || reeling) return;
      if (!e) return;
      tapStart = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
      };
    }

    function endTap(e) {
      if (!tapStart || pressed || reeling) return;
      const dt = performance.now() - tapStart.t;
      const dx = (e?.clientX ?? tapStart.x) - tapStart.x;
      const dy = (e?.clientY ?? tapStart.y) - tapStart.y;
      const moved = Math.hypot(dx, dy);
      const nearWater = Math.abs(tapStart.y - waterlineY()) < 70;
      if (dt < 320 && moved < 14 && nearWater) {
        const { min, max } = bounds();
        boatTargetX = clamp(tapStart.x - 60, min, max);
        startGame();
      }
      tapStart = null;
    }

    window.addEventListener("pointerdown", startTap, { passive: true });
    window.addEventListener("pointerup", endTap, { passive: true });
    window.addEventListener("pointercancel", () => (tapStart = null), {
      passive: true,
    });

    if (castBtn) {
      const down = (e) => {
        e.preventDefault?.();
        pressStart();
      };
      const up = (e) => {
        e.preventDefault?.();
        pressEnd();
      };

      castBtn.addEventListener("pointerdown", (e) => {
        castBtn.setPointerCapture?.(e.pointerId);
        down(e);
      });
      castBtn.addEventListener("pointerup", up);
      castBtn.addEventListener("pointercancel", up);
      castBtn.addEventListener("pointerleave", () => {
        if (pressed) pressEnd();
      });

      castBtn.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        down(e);
      });
      window.addEventListener("mouseup", up);

      castBtn.addEventListener(
        "touchstart",
        (e) => {
          down(e);
        },
        { passive: false }
      );
      window.addEventListener(
        "touchend",
        (e) => {
          up(e);
        },
        { passive: false }
      );

      castBtn.addEventListener("keydown", (e) => {
        if (e.repeat) return;
        if (e.key === " " || e.key === "Enter") down(e);
      });
      castBtn.addEventListener("keyup", (e) => {
        if (e.key === " " || e.key === "Enter") up(e);
      });
    }

    if (reelPad) {
      reelPad.addEventListener(
        "touchmove",
        (e) => {
          if (!reeling) return;
          if (e.cancelable) e.preventDefault();
          const t = e.touches?.[0];
          if (!t) return;
          reelFromPointer(t.clientX, t.clientY);
        },
        { passive: false }
      );
      reelPad.addEventListener(
        "pointermove",
        (e) => {
          if (!reeling) return;
          reelFromPointer(e.clientX, e.clientY);
        },
        { passive: true }
      );
      reelPad.addEventListener(
        "pointerdown",
        (e) => {
          if (!reeling) return;
          reelAngle = null;
          reelDir = 0;
          reelCarry = 0;
          reelFromPointer(e.clientX, e.clientY);
        },
        { passive: true }
      );
    }

    function syncMotion() {
      if (reduceMotion?.matches) {
        background?.stop?.();
        background?.renderOnce?.();
      } else {
        background?.start?.();
      }
    }

    syncMotion();
    reduceMotion?.addEventListener?.("change", syncMotion);
    window.addEventListener(
      "resize",
      () => {
        background?.resize?.();
        stopGame();
        startGame();
      },
      { passive: true }
    );
    window.visualViewport?.addEventListener?.(
      "resize",
      () => {
        background?.resize?.();
        stopGame();
        startGame();
      },
      { passive: true }
    );
    window.addEventListener(
      "pointermove",
      (e) => {
        background?.setPointer?.(e.clientX, e.clientY);
        reelFromPointer(e.clientX, e.clientY);
      },
      { passive: true }
    );
    window.addEventListener(
      "scroll",
      () => {
        // keep bait aligned while the page moves under the rig
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", syncMotion);
  }

  const background = createBackground();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
