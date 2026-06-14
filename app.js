// ============================================================
//  Логика квеста: роутинг по hash, рендер экранов, прогресс
//  Наполнение берётся из config.js (объект QUEST)
// ============================================================

(function () {
  "use strict";

  const app = document.getElementById("app");
  const STORE_KEY = "bday-quest-found";
  const total = QUEST.floors.length;

  // ---------- прогресс в localStorage ----------
  function getFound() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }
  function markFound(n) {
    const found = getFound();
    const wasNew = !found.has(n);
    found.add(n);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...found]));
    } catch (e) {}
    return wasNew;
  }

  // ---------- утилиты ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function progressHtml(count) {
    const pct = Math.round((count / total) * 100);
    return (
      '<div class="progress-wrap">' +
      '<div class="progress-label">Найдено ' + count + " из " + total + "</div>" +
      '<div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>' +
      "</div>"
    );
  }

  // плавная анимация заполнения полосы после рендера
  function animateProgress(count) {
    const fill = app.querySelector(".progress-fill");
    if (!fill) return;
    const pct = Math.round((count / total) * 100);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fill.style.width = pct + "%";
      });
    });
  }

  // ---------- рендер медиа-подсказки ----------
  function mediaHtml(hint) {
    if (!hint || !hint.src) return "";
    const src = hint.src;
    if (hint.type === "video") {
      // embed-ссылка (YouTube / Google Drive / любой iframe) или локальный файл
      if (/^https?:\/\//.test(src) && !/\.(mp4|webm|ogg)(\?|$)/i.test(src)) {
        return '<iframe src="' + esc(src) + '" allowfullscreen loading="lazy"></iframe>';
      }
      return (
        '<video src="' + esc(src) + '" controls playsinline preload="metadata"></video>'
      );
    }
    // по умолчанию — картинка (фото/открытка)
    return '<img src="' + esc(src) + '" alt="Подсказка" loading="lazy" ' +
           'onerror="this.style.display=\'none\'" />';
  }

  function hintBlock(hint) {
    if (!hint) return "";
    const media = mediaHtml(hint);
    const cap = hint.caption
      ? '<p class="caption">' + esc(hint.caption) + "</p>"
      : "";
    if (!media && !cap) return "";
    return (
      '<div class="hint">' +
      '<div class="hint-title">🔎 Подсказка</div>' +
      media +
      cap +
      "</div>"
    );
  }

  function congratsBlock(floor) {
    if (!floor.congrats) return "";
    const media = mediaHtml(floor.congrats);
    const cap = floor.congrats.caption
      ? '<p class="caption">' + esc(floor.congrats.caption) + "</p>"
      : "";
    if (!media && !cap) return "";
    const label = esc(QUEST.congratsButton || "🎉 Показать поздравление");
    return (
      '<button class="btn btn-congrats" type="button" ' +
      'onclick="window.__revealCongrats(this)">' + label + "</button>" +
      '<div class="congrats" hidden>' +
      '<div class="congrats-title">💌 Поздравление</div>' +
      media +
      cap +
      "</div>"
    );
  }

  // открыть поздравление по кнопке
  window.__revealCongrats = function (btn) {
    const box = btn.nextElementSibling;
    if (!box) return;
    box.hidden = false;
    box.classList.add("show");
    btn.style.display = "none";
    launchConfetti();
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ---------- экраны ----------
  function renderWelcome() {
    const w = QUEST.welcome;
    app.innerHTML =
      '<div class="card">' +
      '<span class="emoji-big">🎁</span>' +
      '<span class="eyebrow">Квест начинается</span>' +
      "<h1>" + esc(w.headline) + "</h1>" +
      '<p class="lead">' + esc(w.message) + "</p>" +
      hintBlock(w.hint) +
      '<p class="foot-note">Найди первый QR-код и отсканируй его 📷</p>' +
      "</div>";
    setTitle("Старт");
  }

  function renderFloor(idx) {
    const floor = QUEST.floors[idx];
    const num = idx + 1;
    const wasNew = markFound(num);
    const count = getFound().size;
    const isLast = num === total;

    app.innerHTML =
      progressHtml(count) +
      '<div class="card">' +
      '<span class="emoji-big">🎉</span>' +
      '<span class="eyebrow">' + esc(floor.floor) + " · уровень " + num + "</span>" +
      "<h2>Ты нашёл мини-подарок!</h2>" +
      '<div class="gift">' +
      '<div class="gift-title">🎁 Твой подарок</div>' +
      '<div class="gift-name">' + esc(floor.gift) + "</div>" +
      "</div>" +
      congratsBlock(floor) +
      hintBlock(floor.hint) +
      (isLast
        ? '<a class="btn" href="#final">К сюрпризу 🎂</a>'
        : '<p class="foot-note">Найди следующий QR-код и отсканируй его 📷</p>') +
      "</div>";

    setTitle(floor.floor);
    animateProgress(count);
    if (wasNew) launchConfetti();
  }

  function renderFinal() {
    const f = QUEST.final;
    // отметить все этажи как пройденные
    for (let i = 1; i <= total; i++) markFound(i);
    const media = mediaHtml(f.media);
    app.innerHTML =
      progressHtml(getFound().size) +
      '<div class="card">' +
      '<span class="emoji-big">🎂</span>' +
      '<span class="eyebrow">Финал</span>' +
      "<h1>" + esc(f.headline) + "</h1>" +
      '<p class="lead">' + esc(f.message) + "</p>" +
      (media ? '<div class="hint">' + media + "</div>" : "") +
      "</div>";
    setTitle("Поздравляю!");
    animateProgress(total);
    launchConfetti(true);
  }

  function setTitle(s) {
    document.title = s + " · Квест 🎉";
  }

  // ---------- роутер ----------
  function route() {
    const hash = (location.hash || "").replace(/^#\/?/, "").trim().toLowerCase();
    window.scrollTo(0, 0);

    if (hash === "" || hash === "start") return renderWelcome();
    if (hash === "final") return renderFinal();

    const num = parseInt(hash, 10);
    if (!isNaN(num) && num >= 1 && num <= total) return renderFloor(num - 1);

    // неизвестный hash → на старт
    location.hash = "";
    renderWelcome();
  }

  window.addEventListener("hashchange", route);
  route();

  // ============================================================
  //  Конфетти (canvas, без зависимостей)
  // ============================================================
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  let pieces = [];
  let rafId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const COLORS = ["#ff5e7e", "#ff8a5b", "#ffd23f", "#9b5de5", "#5ee6a8", "#5bc0ff"];

  function launchConfetti(big) {
    if (window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const n = big ? 180 : 90;
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.3,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        vy: 2 + Math.random() * 4,
        vx: -1.5 + Math.random() * 3,
        sway: Math.random() * Math.PI * 2,
      });
    }
    if (!rafId) tick();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.sway += 0.05;
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.sway) * 1.2;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      if (p.y > canvas.height + 30) pieces.splice(i, 1);
    }
    if (pieces.length > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafId = null;
    }
  }
})();
