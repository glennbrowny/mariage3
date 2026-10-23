/* =========================================================
   Invitation de mariage — interactions & motion
   (même grammaire d'animation que le site « evens » :
   GSAP + ScrollTrigger, easing expo/power3, révélations
   au scroll, boutons magnétiques, cartes inclinables…)
   ========================================================= */
(function () {
  "use strict";

  const W = window.WEDDING || {};
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  /* =========================================================
     1. Contenus dynamiques depuis config.js
     ========================================================= */
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), W);
  if (W.groom && W.bride) W.initials = W.groom.charAt(0) + "&" + W.bride.charAt(0);
  $$("[data-bind]").forEach((el) => {
    const v = get(el.dataset.bind);
    if (v != null && v !== "") el.textContent = v;
  });

  const coupleNames = `${W.groom || ""} & ${W.bride || ""}`;

  // Google Maps, calendrier
  const mapsUrl = (ev) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${ev.place}, ${ev.address}`);
  const icsDate = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcalUrl = (ev) =>
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(`Mariage ${coupleNames} — ${ev.title}`) +
    "&dates=" + icsDate(ev.start) + "/" + icsDate(ev.end) +
    "&location=" + encodeURIComponent(`${ev.place}, ${ev.address}`) +
    "&details=" + encodeURIComponent(`Nous avons hâte de célébrer avec vous ! ${location.href.split("#")[0]}`);

  function downloadIcs(ev, key) {
    const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Invitation mariage//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + key + "-" + icsDate(ev.start) + "@invitation-mariage",
      "DTSTAMP:" + icsDate(new Date().toISOString()),
      "DTSTART:" + icsDate(ev.start),
      "DTEND:" + icsDate(ev.end),
      "SUMMARY:" + esc(`Mariage ${coupleNames} — ${ev.title}`),
      "LOCATION:" + esc(`${ev.place}, ${ev.address}`),
      "DESCRIPTION:" + esc("Nous avons hâte de célébrer avec vous !"),
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Mariage demain !", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mariage-${key}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("Événement ajouté : ouvrez le fichier pour l'enregistrer");
  }

  $$("[data-event]").forEach((card) => {
    const key = card.dataset.event;
    const ev = W[key];
    if (!ev) return;
    $$(".js-maps", card).forEach((a) => (a.href = mapsUrl(ev)));
    $$(".js-gcal", card).forEach((a) => (a.href = gcalUrl(ev)));
    $$(".js-ics", card).forEach((b) => b.addEventListener("click", () => downloadIcs(ev, key)));
  });

  // WhatsApp
  const waLink = (text) => `https://wa.me/${W.whatsapp}?text=${encodeURIComponent(text)}`;
  const waQuickText =
    `Bonjour ${coupleNames} ! Je confirme ma présence à votre mariage (${W.dateLong}).\n\n` +
    "Nom : \nNombre d'accompagnants : \nRégime alimentaire : ";
  $$(".js-wa-quick").forEach((a) => (a.href = waLink(waQuickText)));
  $$(".js-gift").forEach((a) => (a.href = W.giftUrl || "#"));

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
  }

  // Copier le numéro mobile money
  $$(".js-copy-momo").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const txt = W.mobileMoney || btn.textContent.trim();
      const num = (txt.match(/\+?[\d\s]{8,}/) || [txt])[0].trim();
      try {
        await navigator.clipboard.writeText(num);
      } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = num; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (_) {}
        ta.remove();
      }
      toast("Numéro copié : " + num);
    })
  );

  /* =========================================================
     2. Hero : découpage des prénoms lettre par lettre
     ========================================================= */
  const h1 = $(".hero__names");
  if (h1) h1.setAttribute("aria-label", `${W.groom} et ${W.bride}`);
  $$("[data-split]").forEach((el) => {
    const txt = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-hidden", "true");
    Array.from(txt).forEach((ch) => {
      const s = document.createElement("span");
      s.className = "char";
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    });
  });

  /* =========================================================
     3. En-tête, progression, menu, lien actif
     ========================================================= */
  const header = $("#header");
  const progress = $(".progress");
  const rsvpFloat = $(".rsvp-float");
  let rsvpInView = false;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 30);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (rsvpFloat) rsvpFloat.classList.toggle("is-visible", y > window.innerHeight * 0.85 && !rsvpInView && !document.body.classList.contains("is-locked"));
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = $("#burger");
  const nav = $("#nav");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("is-menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.body.classList.toggle("is-locked", open);
    onScroll();
  }
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 960 && nav.classList.contains("is-open")) setMenu(false); });

  if ("IntersectionObserver" in window) {
    const links = $$(".nav__link");
    const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => io.observe(s));

    const rsvpSection = $("#rsvp");
    if (rsvpSection) {
      new IntersectionObserver(([entry]) => { rsvpInView = entry.isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(rsvpSection);
    }
  }
  onScroll();

  /* ---------- Texte rotatif du hero ---------- */
  const rotItems = $$(".rotator__item");
  if (rotItems.length > 1 && !reduceMotion) {
    let i = 0;
    setInterval(() => {
      const cur = rotItems[i];
      cur.classList.remove("is-active");
      cur.classList.add("is-out");
      setTimeout(() => cur.classList.remove("is-out"), 650);
      i = (i + 1) % rotItems.length;
      rotItems[i].classList.add("is-active");
    }, 2600);
  }

  /* =========================================================
     4. Micro-interactions (pointeur fin uniquement)
     ========================================================= */
  if (finePointer && !reduceMotion) {
    // Cartes : spotlight + inclinaison 3D
    $$("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 7}deg) translateY(-6px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });

    // Boutons magnétiques
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });

    // Parallaxe souris sur les visuels du hero
    const hero = $(".hero");
    const layers = $$("[data-depth]");
    if (hero && layers.length) {
      let raf = null;
      hero.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const cx = e.clientX / window.innerWidth - 0.5;
          const cy = e.clientY / window.innerHeight - 0.5;
          layers.forEach((l) => {
            const d = parseFloat(l.dataset.depth);
            l.style.translate = `${-cx * d}px ${-cy * d}px`;
          });
          raf = null;
        });
      });
    }
  }

  /* ---------- Liens qui « roulent » au survol ---------- */
  if (!reduceMotion) {
    $$(".nav__link, .footer__col a").forEach((a) => {
      const node = Array.from(a.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
      if (!node) return;
      const roll = document.createElement("span");
      roll.className = "roll";
      roll.innerHTML = "<span></span>";
      roll.firstChild.textContent = node.textContent.trim();
      a.replaceChild(roll, node);
    });
  }

  /* =========================================================
     5. Galerie : filtres + lightbox
     ========================================================= */
  const filters = $(".filters");
  const pill = $(".filters__pill");
  const fBtns = $$(".filters__btn");
  const gItems = $$(".g-item");

  function movePill(btn) {
    if (!pill || !btn) return;
    pill.style.width = btn.offsetWidth + "px";
    pill.style.height = btn.offsetHeight + "px";
    pill.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
  }
  if (filters) {
    filters.classList.add("is-ready");
    requestAnimationFrame(() => movePill($(".filters__btn.is-active")));
    window.addEventListener("resize", () => movePill($(".filters__btn.is-active")));
    document.fonts && document.fonts.ready.then(() => movePill($(".filters__btn.is-active")));
  }

  fBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      fBtns.forEach((b) => { b.classList.toggle("is-active", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
      movePill(btn);
      const f = btn.dataset.filter;
      const show = [], hide = [];
      gItems.forEach((it) => (f === "all" || it.dataset.cat.split(" ").includes(f) ? show : hide).push(it));
      hide.forEach((it) => it.classList.add("is-hiding"));
      setTimeout(() => {
        hide.forEach((it) => it.classList.add("is-hidden"));
        show.forEach((it) => { it.classList.remove("is-hidden"); it.classList.add("is-hiding"); });
        void document.body.offsetHeight; // reflow
        show.forEach((it, i) => setTimeout(() => it.classList.remove("is-hiding"), reduceMotion ? 0 : i * 60));
        if (hasGsap) ScrollTrigger.refresh();
      }, reduceMotion ? 0 : 380);
    })
  );

  const lb = $("#lightbox");
  const lbImg = $(".lightbox__img", lb);
  const lbTitle = $(".lightbox__title", lb);
  const lbCount = $(".lightbox__count", lb);
  let lbList = [];
  let current = 0;
  let lastFocus = null;

  function showSlide(index) {
    current = (index + lbList.length) % lbList.length;
    const item = lbList[current];
    const img = $("img", item);
    const cap = $(".g-item__cap", item);
    lbImg.classList.remove("is-in");
    const next = new Image();
    next.onload = () => {
      lbImg.src = next.src;
      lbImg.alt = img.alt;
      requestAnimationFrame(() => lbImg.classList.add("is-in"));
    };
    next.src = img.currentSrc || img.src;
    lbTitle.textContent = cap ? cap.textContent : "";
    lbCount.textContent = String(current + 1).padStart(2, "0") + " / " + String(lbList.length).padStart(2, "0");
  }
  function openLightbox(item) {
    lbList = gItems.filter((it) => !it.classList.contains("is-hidden"));
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => lb.classList.add("is-open"));
    showSlide(lbList.indexOf(item));
    $(".lightbox__close", lb).focus();
  }
  function closeLightbox() {
    lb.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => { lb.hidden = true; lbImg.classList.remove("is-in"); }, 350);
    if (lastFocus) lastFocus.focus();
  }
  gItems.forEach((item) => item.addEventListener("click", () => openLightbox(item)));
  $(".lightbox__close", lb).addEventListener("click", closeLightbox);
  $(".lightbox__nav--prev", lb).addEventListener("click", () => showSlide(current - 1));
  $(".lightbox__nav--next", lb).addEventListener("click", () => showSlide(current + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showSlide(current - 1);
    if (e.key === "ArrowRight") showSlide(current + 1);
    if (e.key === "Tab") {
      const f = $$("button", lb);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showSlide(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* =========================================================
     6. FAQ : accordéons
     ========================================================= */
  $$(".acc__btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const acc = btn.closest(".acc");
      const open = !acc.classList.contains("is-open");
      $$(".acc.is-open").forEach((o) => { if (o !== acc) { o.classList.remove("is-open"); $(".acc__btn", o).setAttribute("aria-expanded", "false"); } });
      acc.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 600);
    })
  );

  /* =========================================================
     7. Compte à rebours (chiffres qui roulent)
     ========================================================= */
  const target = new Date(W.date).getTime();
  const units = { days: $('[data-unit="days"]'), hours: $('[data-unit="hours"]'), minutes: $('[data-unit="minutes"]'), seconds: $('[data-unit="seconds"]') };

  function setDigits(el, str) {
    if (!el) return;
    if (reduceMotion || el.dataset.v === undefined || el.dataset.v.length !== str.length) {
      el.innerHTML = "";
      Array.from(str).forEach((c) => {
        const d = document.createElement("span");
        d.className = "digit";
        d.innerHTML = "<span></span>";
        d.firstChild.textContent = c;
        el.appendChild(d);
      });
      el.dataset.v = str;
      return;
    }
    const prev = el.dataset.v;
    Array.from(str).forEach((c, i) => {
      if (prev[i] === c) return;
      const d = el.children[i];
      Array.from(d.children).forEach((old) => {
        old.classList.remove("is-enter");
        old.classList.add("is-leave");
        setTimeout(() => old.remove(), 700);
      });
      const n = document.createElement("span");
      n.className = "is-enter";
      n.textContent = c;
      d.appendChild(n);
    });
    el.dataset.v = str;
  }

  const countdownSection = $(".countdown");
  function tick() {
    const diff = target - Date.now();
    if (isNaN(target)) return;
    if (diff <= 0) {
      countdownSection.classList.add("is-done");
      const t = $("#countdownTitle");
      const sameDay = Date.now() - target < 24 * 3600 * 1000;
      if (t) t.innerHTML = sameDay ? "C'est <em>le grand jour</em> !" : "Merci d'avoir <em>célébré avec nous</em>";
      clearInterval(timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    setDigits(units.days, String(Math.floor(s / 86400)).padStart(2, "0"));
    setDigits(units.hours, String(Math.floor((s % 86400) / 3600)).padStart(2, "0"));
    setDigits(units.minutes, String(Math.floor((s % 3600) / 60)).padStart(2, "0"));
    setDigits(units.seconds, String(s % 60).padStart(2, "0"));
  }
  const timer = setInterval(tick, 1000);
  tick();

  /* =========================================================
     8. RSVP
     ========================================================= */
  const form = $("#rsvpForm");
  const success = $("#rsvpSuccess");
  const errorBox = $("#formError");
  const collapse = $("#attendingFields");
  const guestsInput = form.elements.guests;
  const guestsValue = $("#guestsValue");
  const submitBtn = $(".form__submit", form);
  const submitLabel = $(".form__submit-label", form);
  const MAX_GUESTS = 5;

  function updateStepper(v) {
    v = Math.max(0, Math.min(MAX_GUESTS, v));
    guestsInput.value = v;
    guestsValue.textContent = v;
    guestsValue.classList.remove("bump"); void guestsValue.offsetWidth; guestsValue.classList.add("bump");
    $('[data-step="-1"]', form).disabled = v <= 0;
    $('[data-step="1"]', form).disabled = v >= MAX_GUESTS;
  }
  $$("[data-step]", form).forEach((b) => b.addEventListener("click", () => updateStepper(+guestsInput.value + +b.dataset.step)));
  updateStepper(0);

  function syncAttending() {
    const yes = form.elements.attending.value === "yes";
    collapse.classList.toggle("is-open", yes);
    submitLabel.textContent = yes ? "Confirmer ma présence" : "Envoyer ma réponse";
  }
  $$('input[name="attending"]', form).forEach((r) => r.addEventListener("change", syncAttending));
  syncAttending();

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isPhone = (v) => /^\+?[\d\s().-]{8,20}$/.test(v) && v.replace(/\D/g, "").length >= 8;

  function buildWaText(d) {
    const yes = d.attending === "yes";
    return [
      `Bonjour ${coupleNames} !`,
      yes ? `Je confirme ma présence à votre mariage (${W.dateLong}).` : `Je ne pourrai malheureusement pas être présent(e) à votre mariage.`,
      "",
      "Nom : " + d.name,
      yes ? "Accompagnants : " + d.guests : null,
      yes && d.diet ? "Régime / allergies : " + d.diet : null,
      d.message ? "\n" + d.message : null,
    ].filter((l) => l !== null).join("\n");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    d.name = (d.name || "").trim();
    d.contact = (d.contact || "").trim();
    d.public_message = form.elements.public_message.checked ? 1 : 0;

    $$(".field", form).forEach((f) => f.classList.remove("has-error"));
    let err = "";
    if (d.name.length < 2) { err = "Merci d'indiquer votre nom et prénom."; form.elements.name.closest(".field").classList.add("has-error"); form.elements.name.focus(); }
    else if (!isEmail(d.contact) && !isPhone(d.contact)) { err = "Merci d'indiquer un e-mail ou un numéro WhatsApp valide."; form.elements.contact.closest(".field").classList.add("has-error"); form.elements.contact.focus(); }
    if (err) { errorBox.textContent = err; return; }
    errorBox.textContent = "";
    if (d.attending !== "yes") { d.guests = 0; d.diet = ""; }

    // Piège à robots rempli : on fait semblant que tout va bien
    if (d.website) { showSuccess(d); return; }

    // 1) WhatsApp : ouvert tout de suite (dans le clic, sinon le navigateur bloque la fenêtre)
    if (W.whatsapp) window.open(waLink(buildWaText(d)), "_blank", "noopener");

    // 2) E-mail aux mariés via FormSubmit (gratuit, sans serveur) — en arrière-plan
    if (W.email) sendEmail(d);

    // 3) On garde la réponse sur cet appareil pour l'afficher dans « Ils seront présents »
    saveMyRsvp(d);
    showSuccess(d);
    renderGuests();
  });

  function sendEmail(d) {
    const yes = d.attending === "yes";
    const payload = {
      _subject: `${yes ? "✔ Présent" : "✘ Absent"} — ${d.name}${yes && +d.guests ? " (+" + d.guests + ")" : ""}`,
      _template: "table",
      _captcha: "false",
      "Nom": d.name,
      "Contact": d.contact,
      "Réponse": yes ? "Présent(e)" : "Absent(e)",
      "Accompagnants": yes ? String(d.guests) : "0",
      "Régime / allergies": d.diet || "—",
      "Message": d.message || "—",
      "Accepte d'apparaître dans la liste publique": d.public_message ? "Oui" : "Non",
    };
    if (isEmail(d.contact)) payload._replyto = d.contact;
    fetch("https://formsubmit.co/ajax/" + encodeURIComponent(W.email), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  function showSuccess(d) {
    const yes = d.attending === "yes";
    $(".success__title", success).textContent = yes ? "Merci, votre présence est confirmée." : "Merci pour votre réponse.";
    $(".success__text", success).textContent = yes
      ? `Nous avons hâte de célébrer ce jour avec vous${+d.guests > 0 ? " et vos " + d.guests + " accompagnant" + (+d.guests > 1 ? "s" : "") : ""}. Pensez à envoyer le message WhatsApp qui vient de s'ouvrir.`
      : "Vous allez nous manquer ! Pensez à envoyer le message WhatsApp qui vient de s'ouvrir.";
    $(".js-wa-after", success).href = waLink(buildWaText(d));
    form.hidden = true;
    success.hidden = false;
    success.classList.remove("is-in"); void success.offsetWidth; success.classList.add("is-in");
    success.focus({ preventScroll: true });
    const card = $(".rsvp__card");
    const top = card.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    if (yes) confetti();
    if (hasGsap) ScrollTrigger.refresh();
  }
  $(".js-rsvp-again").addEventListener("click", () => {
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
    if (hasGsap) ScrollTrigger.refresh();
  });

  /* ---------- Confettis dorés ---------- */
  function confetti() {
    if (reduceMotion) return;
    const canvas = $(".confetti");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#f0d59a", "#d4af6a", "#9c7a3c", "#e2b3a4", "#fff6e6"];
    const parts = Array.from({ length: 130 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 80,
      y: h * 0.32,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 11 - 4,
      r: Math.random() * 6 + 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
      heart: Math.random() < 0.18,
    }));
    const start = performance.now();
    (function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 3200);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.heart) {
          const s = p.r / 6;
          ctx.scale(s, s);
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-6, -2, -3, -7, 0, -3);
          ctx.bezierCurveTo(3, -7, 6, -2, 0, 3);
          ctx.fill();
        } else {
          ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        }
        ctx.restore();
      });
      if (t < 3300) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    })(start);
  }

  /* =========================================================
     9. « Ils seront présents »
     ========================================================= */
  const gList = $("#guestsList");
  const gEmpty = $("#guestsEmpty");
  const gMore = $("#guestsMore");
  const gTitle = $("#invites .section__title");
  const PAGE = 12;
  let allGuests = [];
  let shown = 0;
  let countShown = 0;

  function guestCard(g) {
    const li = document.createElement("li");
    li.className = "guest";
    const av = document.createElement("span");
    av.className = "guest__avatar"; av.setAttribute("aria-hidden", "true"); av.textContent = g.initials;
    const body = document.createElement("div");
    const name = document.createElement("p");
    name.className = "guest__name"; name.textContent = g.name;
    if (g.guests > 0) {
      const plus = document.createElement("span");
      plus.className = "guest__plus"; plus.textContent = "+" + g.guests;
      plus.setAttribute("aria-label", g.guests + " accompagnant" + (g.guests > 1 ? "s" : ""));
      name.appendChild(plus);
    }
    body.appendChild(name);
    if (g.message) {
      const m = document.createElement("p");
      m.className = "guest__msg"; m.textContent = "« " + g.message + " »";
      body.appendChild(m);
    }
    li.append(av, body);
    return li;
  }

  function renderMore() {
    const slice = allGuests.slice(shown, shown + PAGE);
    const nodes = slice.map(guestCard);
    nodes.forEach((n) => gList.appendChild(n));
    shown += slice.length;
    gMore.hidden = shown >= allGuests.length;
    if (hasGsap && !reduceMotion && nodes.length) {
      gsap.from(nodes, { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.06, ease: "expo.out", scrollTrigger: { trigger: gList, start: "top 90%", once: true } });
    }
  }
  gMore.addEventListener("click", renderMore);

  function setCountTitle(n) {
    if (!gTitle) return;
    if (n === 0) { gTitle.innerHTML = "Les premières <em>confirmations</em> arrivent"; return; }
    gTitle.innerHTML = `<span class="guests__count">${countShown}</span> <em>${n > 1 ? "invités" : "invité"}</em> ${n > 1 ? "ont confirmé leur" : "a confirmé sa"} présence`;
    const el = $(".guests__count", gTitle);
    if (hasGsap && !reduceMotion) {
      const o = { v: countShown };
      gsap.to(o, {
        v: n, duration: 1.8, ease: "power2.out",
        scrollTrigger: { trigger: gTitle, start: "top 90%", once: true },
        onUpdate: () => (el.textContent = Math.round(o.v)),
        onComplete: () => (countShown = n),
      });
    } else { el.textContent = n; countShown = n; }
  }

  // « Jean-Marc Dupont » → « Jean-Marc D. » (on n'affiche jamais le nom complet)
  function publicName(full) {
    const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { name: "", initials: "" };
    const first = parts[0].split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "";
    return { name: last ? `${first} ${last}.` : first, initials: first.charAt(0).toUpperCase() + last };
  }

  const MY_KEY = "monRsvp";
  function saveMyRsvp(d) {
    try {
      if (d.attending === "yes" && d.public_message) {
        localStorage.setItem(MY_KEY, JSON.stringify({ nom: d.name, accompagnants: +d.guests || 0, message: d.message || "" }));
      } else localStorage.removeItem(MY_KEY);
    } catch (e) {}
  }

  // Liste tenue par les mariés dans invites.js (+ la réponse de ce visiteur, visible pour lui seul)
  function renderGuests() {
    const list = (Array.isArray(window.GUESTS) ? window.GUESTS : []).map((g) => ({
      ...publicName(g.nom),
      guests: Math.max(0, parseInt(g.accompagnants, 10) || 0),
      message: String(g.message || "").slice(0, 180),
    })).filter((g) => g.name);

    try {
      const mine = JSON.parse(localStorage.getItem(MY_KEY) || "null");
      if (mine) {
        const me = { ...publicName(mine.nom), guests: +mine.accompagnants || 0, message: String(mine.message || "").slice(0, 180) };
        if (me.name && !list.some((g) => g.name.toLowerCase() === me.name.toLowerCase())) list.unshift(me);
      }
    } catch (e) {}

    allGuests = list;
    gList.innerHTML = ""; shown = 0;
    gEmpty.hidden = allGuests.length > 0;
    setCountTitle(allGuests.reduce((s, g) => s + 1 + g.guests, 0));
    renderMore();
  }
  setTimeout(renderGuests, 0); // après l'initialisation de GSAP (plus bas)

  /* =========================================================
     10. Curseur personnalisé
     ========================================================= */
  const cursor = $(".cursor");
  if (cursor && finePointer && !reduceMotion) {
    const label = $(".cursor__label", cursor);
    let x = -100, y = -100, cx = x, cy = y;
    window.addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("is-visible"); }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
    window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
    window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
    (function loop() {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor], .g-item, a, button, input, textarea, label");
      cursor.classList.remove("is-link", "is-label");
      if (!t) return;
      const text = t.dataset.cursor || (t.matches(".g-item") ? "Voir" : "");
      if (text) { label.textContent = text; cursor.classList.add("is-label"); }
      else if (!t.matches("input, textarea")) cursor.classList.add("is-link");
    });
  }

  /* =========================================================
     10 bis. Bokeh : lumières dorées qui flottent devant
     la photo des alliances (canvas, pause hors écran)
     ========================================================= */
  (function bokeh() {
    const canvases = $$("canvas.bokeh");
    if (!canvases.length) return;
    const palette = [[255, 214, 150], [255, 236, 205], [240, 186, 116], [255, 196, 176], [255, 226, 168]];
    const sprites = palette.map(([r, g, b]) => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const x = c.getContext("2d");
      const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, `rgba(${r},${g},${b},.95)`);
      gr.addColorStop(0.62, `rgba(${r},${g},${b},.55)`);
      gr.addColorStop(0.82, `rgba(${r},${g},${b},.32)`); // léger liseré, comme un vrai bokeh
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = gr;
      x.fillRect(0, 0, 128, 128);
      return c;
    });
    const rand = (a, b) => a + Math.random() * (b - a);
    let tmx = 0, tmy = 0;
    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", (e) => { tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5; }, { passive: true });
    }

    canvases.forEach((cv) => {
      const ctx = cv.getContext("2d");
      const n = +cv.dataset.count || 30;
      let w = 0, h = 0, raf = null, visible = false, mx = 0, my = 0;

      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = cv.offsetWidth; h = cv.offsetHeight;
        cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function spawn(p, initial) {
        const scale = w < 600 ? 0.65 : 1;
        p.r = rand(4, 36) * scale;
        p.depth = p.r / 36;
        p.x = Math.random() * w;
        p.y = initial ? Math.random() * h : h + p.r * 2;
        p.vy = -rand(0.08, 0.36) * (0.45 + p.depth);
        p.vx = rand(-0.08, 0.08);
        p.phase = Math.random() * Math.PI * 2;
        p.tw = rand(0.0006, 0.0022);
        p.a = rand(0.16, 0.6);
        p.sway = rand(0.1, 0.6);
        p.s = sprites[(Math.random() * sprites.length) | 0];
      }
      resize();
      const parts = Array.from({ length: n }, () => { const p = {}; spawn(p, true); return p; });

      function draw(t) {
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
        for (const p of parts) {
          if (!reduceMotion) {
            p.y += p.vy;
            p.x += p.vx + Math.sin(t * 0.0005 + p.phase) * p.sway * 0.25;
            if (p.y < -p.r * 2) spawn(p, false);
            if (p.x < -p.r * 2) p.x = w + p.r; else if (p.x > w + p.r * 2) p.x = -p.r;
          }
          ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(t * p.tw + p.phase));
          ctx.drawImage(p.s, p.x - p.r - mx * p.depth * 40, p.y - p.r - my * p.depth * 40, p.r * 2, p.r * 2);
        }
      }
      function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
      function start() { if (!raf && visible && !document.hidden && !reduceMotion) raf = requestAnimationFrame(loop); }
      function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { if (!w) resize(); start(); } else stop(); }).observe(cv);
      } else { visible = true; }
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
      window.addEventListener("resize", () => { resize(); if (reduceMotion) draw(0); });
      if (reduceMotion) draw(0); else start();
    });
  })();

  /* =========================================================
     11. Ouverture de l'invitation + motion GSAP
     ========================================================= */
  const intro = $("#intro");
  let introDone = false;
  let heroPlayed = false;
  let heroIntro = () => {};

  function playHero() {
    if (heroPlayed) return;
    heroPlayed = true;
    heroIntro();
  }

  function closeIntro() {
    if (introDone) return;
    introDone = true;
    try { sessionStorage.setItem("invitationOpened", "1"); } catch (e) {}
    intro.classList.add("is-leaving");
    document.body.classList.remove("is-locked");
    setTimeout(playHero, reduceMotion ? 0 : 650);
    setTimeout(() => { intro.classList.add("is-skipped"); onScroll(); }, reduceMotion ? 0 : 1500);
    const main = $("#accueil");
    if (main) main.setAttribute("tabindex", "-1");
  }

  const alreadyOpened = document.documentElement.classList.contains("opened");
  if (intro && !alreadyOpened && !location.hash) {
    document.body.classList.add("is-locked");
    const openBtn = $(".intro__open", intro);
    openBtn.addEventListener("click", closeIntro);
    setTimeout(() => openBtn.focus({ preventScroll: true }), 900);
    intro.addEventListener("keydown", (e) => { if (e.key === "Escape") closeIntro(); });
  } else if (intro) {
    introDone = true;
    intro.classList.add("is-skipped");
  }

  if (!hasGsap || reduceMotion) {
    // Pas d'animation : tout est déjà visible
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 1 });

  // États initiaux du hero (posés en JS : sans JS, tout reste visible)
  gsap.set(".hero__name .char", { yPercent: 70, rotateX: -80, autoAlpha: 0, filter: "blur(8px)", transformOrigin: "50% 100%" });
  gsap.set(".hero__amp", { autoAlpha: 0, scale: 0.4, rotate: -25 });
  gsap.set([".hero__eyebrow", ".hero__lead", ".hero__meta li", ".hero__actions"], { autoAlpha: 0, y: 30 });
  gsap.set(".hero__card--main", { autoAlpha: 0, scale: 1.08, clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(".hero__card--sub", { autoAlpha: 0, x: -40 });
  gsap.set(".hero__card--sub2", { autoAlpha: 0, scale: 0.6 });
  gsap.set(".hero__badge", { autoAlpha: 0, y: 30 });
  gsap.set([".hero__scroll", ".hero__monogram"], { autoAlpha: 0 });
  gsap.set(".hero__rings", { scale: 1.22, autoAlpha: 0 });
  gsap.set([".hero__atmos", ".hero .bokeh", ".hero__ring"], { autoAlpha: 0 });

  heroIntro = function () {
    const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.3 } });
    tl.to(".hero__atmos", { autoAlpha: 1, duration: 2 }, 0)
      .to(".hero__rings", { scale: 1, autoAlpha: 1, duration: 3, ease: "power2.out" }, 0)
      .to(".hero .bokeh", { autoAlpha: 1, duration: 2.4, ease: "power1.inOut" }, 0.5)
      .to(".hero__ring", { autoAlpha: 1, duration: 2 }, 0.9)
      .to(".hero__eyebrow", { autoAlpha: 1, y: 0, duration: 1 }, 0.1)
      .to(".hero__name .char", { yPercent: 0, rotateX: 0, autoAlpha: 1, filter: "blur(0px)", stagger: 0.055, duration: 1.4 }, 0.25)
      .to(".hero__amp", { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease: "elastic.out(1, 0.6)" }, 0.65)
      .to(".hero__lead", { autoAlpha: 1, y: 0 }, 0.9)
      .to(".hero__meta li", { autoAlpha: 1, y: 0, stagger: 0.08 }, 1)
      .to(".hero__actions", { autoAlpha: 1, y: 0 }, 1.1)
      .to(".hero__card--main", { autoAlpha: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.8 }, 0.3)
      .to(".hero__card--sub", { autoAlpha: 1, x: 0 }, 0.8)
      .to(".hero__card--sub2", { autoAlpha: 1, scale: 1, ease: "back.out(1.6)" }, 0.95)
      .to(".hero__badge", { autoAlpha: 1, y: 0 }, 1.1)
      .to(".hero__monogram", { autoAlpha: 1, duration: 2.4 }, 0.6)
      .to(".hero__scroll", { autoAlpha: 1 }, 1.4);
  };

  if (introDone) {
    if (document.readyState === "complete") setTimeout(playHero, 150);
    else window.addEventListener("load", () => setTimeout(playHero, 150));
    setTimeout(playHero, 1800); // garde-fou si une image tarde
  }

  // Parallaxe des arrière-plans
  $$("[data-parallax]").forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2;
    gsap.to(el, { yPercent: speed * 40, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top top", end: "bottom top", scrub: true } });
  });
  [[".quote__bg", ".quote"], [".countdown__bg", ".countdown"]].forEach(([bg, sec]) => {
    gsap.fromTo(bg, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Hero : profondeur à la sortie
  gsap.to(".hero__content", { y: -70, autoAlpha: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "center center", end: "bottom top", scrub: true } });
  gsap.to(".hero__monogram", { yPercent: -25, xPercent: -6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // Apparitions génériques
  $$(".reveal").forEach((el) => {
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 1.1, clearProps: "transform", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });

  // Carton d'invitation : coins dorés qui se dessinent
  gsap.from(".paper__corner", { scale: 0, autoAlpha: 0, duration: 1.2, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".paper", start: "top 75%", once: true } });
  gsap.from(".paper__grid > div", { y: 30, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".paper__grid", start: "top 90%", once: true } });
  gsap.from(".ornament span", { scaleX: 0, duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: ".ornament", start: "top 90%", once: true } });

  // Images : rideau + parallaxe interne
  $$(".reveal-img").forEach((wrap) => {
    gsap.from(wrap, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: wrap, start: "top 85%", once: true } });
    const img = $("[data-parallax-img]", wrap);
    if (img) gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Les mariés : cartes en cascade + esperluette qui tourne
  gsap.from(".person", { y: 80, autoAlpha: 0, duration: 1.2, stagger: 0.18, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: ".couple__grid", start: "top 80%", once: true } });
  gsap.from(".person__body > *", { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".couple__grid", start: "top 60%", once: true } });
  gsap.fromTo(".couple__amp span", { rotate: -90, scale: 0.6 }, { rotate: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".couple__grid", start: "top 85%", end: "center center", scrub: 0.6 } });

  // Notre histoire : la ligne se trace et les étapes s'allument
  const moments = $$(".moment");
  gsap.to(".timeline", {
    "--p": 1, ease: "none",
    scrollTrigger: {
      trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: 0.5,
      onUpdate: (self) => moments.forEach((m, i) => m.classList.toggle("is-active", self.progress >= i / moments.length + 0.02)),
    },
  });
  moments.forEach((m, i) => {
    const fromLeft = window.innerWidth > 960 ? (i % 2 === 0 ? -60 : 60) : 0;
    gsap.from($(".moment__body", m), { x: -fromLeft, y: fromLeft ? 0 : 40, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: m, start: "top 80%", once: true } });
  });

  // Citations / textes : apparition mot par mot au défilement
  $$(".split-words").forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = "";
    words.forEach((w, i) => {
      const s = document.createElement("span");
      s.className = "w"; s.textContent = w;
      p.appendChild(s);
      if (i < words.length - 1) p.appendChild(document.createTextNode(" "));
    });
    gsap.fromTo($$(".w", p), { opacity: 0.12, y: 14 }, { opacity: 1, y: 0, stagger: 0.08, ease: "none", scrollTrigger: { trigger: p, start: "top 85%", end: "bottom 55%", scrub: 0.6 } });
  });

  // Galerie
  // (révélation en CSS : les vignettes ont déjà des transitions de survol/filtre)
  document.documentElement.classList.add("motion");
  ScrollTrigger.batch(".g-item", {
    start: "top 92%", once: true,
    onEnter: (batch) => batch.forEach((el, i) => {
      el.style.setProperty("--d", i * 0.08 + "s");
      el.classList.add("is-in");
      setTimeout(() => el.style.removeProperty("--d"), 1600);
    }),
  });

  // Détails
  gsap.from(".event", { y: 70, autoAlpha: 0, duration: 1.2, stagger: 0.15, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: ".events", start: "top 85%", once: true } });
  gsap.from(".event__list li", { x: -20, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: "expo.out", scrollTrigger: { trigger: ".events", start: "top 75%", once: true } });
  gsap.from(".swatches li", { scale: 0, autoAlpha: 0, duration: 1, stagger: 0.08, ease: "back.out(1.8)", scrollTrigger: { trigger: ".swatches", start: "top 92%", once: true } });
  gsap.from(".program__item", { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".program__list", start: "top 85%", once: true } });

  // Compte à rebours
  gsap.from(".timer__unit", { y: 60, autoAlpha: 0, rotateX: -50, duration: 1.3, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".timer", start: "top 88%", once: true } });

  // RSVP
  gsap.from(".form > *", { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.06, ease: "expo.out", clearProps: "transform,opacity,visibility", scrollTrigger: { trigger: ".rsvp__card", start: "top 80%", once: true } });

  // Grand logotype du pied de page
  gsap.from(".footer__wordmark > *", { yPercent: 60, autoAlpha: 0, stagger: 0.15, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".footer__wordmark", start: "top 95%", once: true } });

  // Un recalcul ScrollTrigger peut ramener brièvement la page en haut : on resynchronise l'en-tête
  ScrollTrigger.addEventListener("refresh", onScroll);
  window.addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
