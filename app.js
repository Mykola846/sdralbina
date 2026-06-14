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
      '<div class="hint-title">Подсказка</div>' +
      media +
      cap +
      "</div>"
    );
  }

  function treatBlock(treat) {
    if (!treat) return "";
    return (
      '<div class="treat">' +
      '<div class="treat-title">Тебе</div>' +
      '<p class="treat-text">' + esc(treat).replace(/\n/g, "<br>") + "</p>" +
      "</div>"
    );
  }

  function congratsBlock(floor) {
    const c = floor.congrats;
    if (!c) return "";
    const media = mediaHtml(c);
    const cap = c.caption
      ? '<p class="caption">' + esc(c.caption).replace(/\n/g, "<br>") + "</p>"
      : "";
    const poster = c.poster
      ? '<div class="poster-wrap blurred" ' +
        "onclick=\"this.classList.remove('blurred')\">" +
        '<img class="congrats-poster" src="' + esc(c.poster) +
        '" alt="" onerror="this.style.display=\'none\'" />' +
        '<span class="poster-hint">Нажми, чтобы открыть</span>' +
        "</div>"
      : "";
    if (!media && !cap && !poster) return "";
    const label = esc(
      c.revealLabel || QUEST.congratsButton || "Показать поздравление"
    );
    const from = c.from
      ? '<div class="congrats-from">Поздравление от ' + esc(c.from) + "</div>"
      : "";
    return (
      from +
      poster +
      '<button class="btn btn-congrats" type="button" ' +
      'onclick="window.__revealCongrats(this)">' + label + "</button>" +
      '<div class="congrats" hidden>' +
      media +
      cap +
      "</div>"
    );
  }

  // особый блок «история» (комикс-лента) для этажа со story
  function storyBlock(floor) {
    const s = floor.story;
    if (!s) return "";
    const label = esc(s.buttonLabel || "Открыть историю");
    const from = s.from
      ? '<div class="congrats-from">Поздравление от ' + esc(s.from) + "</div>"
      : "";

    function sec(part) {
      if (!part) return "";
      const t = part.text
        ? '<p class="story-text">' +
          esc(part.text).replace(/\n/g, "<br>") +
          "</p>"
        : "";
      const v = part.video ? mediaHtml({ type: "video", src: part.video }) : "";
      if (!t && !v) return "";
      return '<div class="story-sec">' + t + v + "</div>";
    }

    let panels = "";
    (s.panels || []).forEach(function (p, i) {
      panels +=
        '<div class="panel">' +
        '<div class="panel-photo" style="background-image:url(\'' +
        esc(p.photo) + "?s=3" +
        "')\">" +
        '<span class="panel-badge">' + (i + 1) + "</span>" +
        "</div>" +
        '<div class="panel-cap">' + esc(p.text) + "</div>" +
        "</div>";
    });
    const slider = panels
      ? '<div class="slider">' + panels + "</div>" +
        '<div class="slider-hint">← листай →</div>'
      : "";

    return (
      from +
      '<button class="btn btn-congrats" type="button" ' +
      'onclick="window.__revealCongrats(this)">' + label + "</button>" +
      '<div class="congrats story" hidden>' +
      sec(s.intro) +
      slider +
      sec(s.outro) +
      (s.love ? sec(s.love) : "") +
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
    const isStory = box.classList.contains("story");
    if (isStory) {
      // история: ничего не автоплеим и не прыгаем к видео — пусть читает с начала
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const v = box.querySelector("video");
      if (v) {
        try {
          const p = v.play();
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      }
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // сквиш/слайм-эффект при тапе по фото
  window.__squish = function (el) {
    if (!el.animate) return;
    el.animate(
      [
        { transform: "scale(1, 1)" },
        { transform: "scale(1.28, 0.74)" },
        { transform: "scale(0.78, 1.24)" },
        { transform: "scale(1.14, 0.88)" },
        { transform: "scale(0.93, 1.08)" },
        { transform: "scale(1.03, 0.97)" },
        { transform: "scale(1, 1)" },
      ],
      { duration: 700, easing: "ease-out" }
    );
  };

  // ---------- экраны ----------
  function renderWelcome() {
    const w = QUEST.welcome;
    const hero = w.photo
      ? '<img class="hero-photo" src="' + esc(w.photo) +
        '" alt="" onclick="window.__squish(this)" ' +
        'onerror="this.style.display=\'none\'" />'
      : "";
    app.innerHTML =
      '<div class="card">' +
      hero +
      '<span class="eyebrow">Квест начинается</span>' +
      "<h1>" + esc(w.headline) + "</h1>" +
      '<p class="lead">' + esc(w.message) + "</p>" +
      treatBlock(w.treat) +
      '<p class="foot-note">Найди первый код и отсканируй его</p>' +
      "</div>";
    setTitle("Старт");
  }

  function renderFloor(idx) {
    const floor = QUEST.floors[idx];
    const num = idx + 1;
    const wasNew = markFound(num);
    const count = num; // прогресс = номер этажа (на 1 этаже «1 из N», на 2 «2 из N» ...)
    const isLast = num === total;

    app.innerHTML =
      progressHtml(count) +
      '<div class="card">' +
      '<span class="eyebrow">' + esc(floor.floor) + " · уровень " + num + "</span>" +
      "<h2>Подарок найден</h2>" +
      '<div class="gift">' +
      '<div class="gift-title">Твой подарок</div>' +
      '<div class="gift-name">' + esc(floor.gift) + "</div>" +
      "</div>" +
      congratsBlock(floor) +
      storyBlock(floor) +
      treatBlock(floor.treat) +
      (isLast
        ? '<a class="btn" href="#final">К сюрпризу</a>'
        : '<p class="foot-note">Найди следующий код и отсканируй его</p>') +
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
      progressHtml(total) +
      '<div class="card">' +
      '<span class="emoji-big">🎂</span>' +
      '<span class="eyebrow">Финал</span>' +
      "<h1>" + esc(f.headline) + "</h1>" +
      '<p class="lead">' + esc(f.message).replace(/\n/g, "<br>") + "</p>" +
      (media ? '<div class="final-media">' + media + "</div>" : "") +
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
