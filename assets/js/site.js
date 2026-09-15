(function () {
  "use strict";

  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  $$("[data-mod]").forEach(function (k) { k.textContent = isMac ? "⌘" : "Ctrl"; });
  $$("[data-year]").forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* Toast ---------------------------------------------------------------- */
  var toastEl = $("[data-toast]");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2000);
  }

  function copy(text, label) {
    var done = function () { toast(label || "Copied to clipboard"); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* Theme ---------------------------------------------------------------- */
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  }
  $$("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", toggleTheme); });

  /* Navigation ----------------------------------------------------------- */
  var nav = $("[data-nav]");
  var menuBtn = $("[data-menu]");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function closeMenu() { nav.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-links a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  var navLinks = $$(".nav-links a");
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* Reveal on scroll ----------------------------------------------------- */
  var revealEls = $$("[data-reveal]");
  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var siblings = $$("[data-reveal]", e.target.parentElement).filter(function (s) { return s.parentElement === e.target.parentElement; });
        var i = Math.max(0, siblings.indexOf(e.target));
        e.target.style.transitionDelay = Math.min(i * 70, 350) + "ms";
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* Card spotlight ------------------------------------------------------- */
  $$(".card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* Copy + cite ---------------------------------------------------------- */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () { copy(b.getAttribute("data-copy"), "Email copied"); });
  });
  $$("[data-cite]").forEach(function (b) {
    var pre = document.getElementById(b.getAttribute("data-cite"));
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", pre.id);
    b.addEventListener("click", function () {
      var opening = pre.hidden;
      pre.hidden = !opening;
      b.setAttribute("aria-expanded", String(opening));
      b.textContent = opening ? "Hide citation" : "Cite";
      if (opening) copy(pre.textContent, "BibTeX copied");
    });
  });

  /* Agent trace ---------------------------------------------------------- */
  var SCENARIOS = [
    {
      id: "agentic-rag",
      rows: [
        ["user", "Which supplier contracts renew in Q4, and what changed in their terms?", ""],
        ["plan", "2 sub-tasks → route: sql + documents", "18ms"],
        ["tool", "sql.query(contracts, renews_in=\"Q4\") → 12 rows", "140ms"],
        ["tool", "retrieve(clauses, k=24) → rerank → top 8", "310ms"],
        ["check", "faithfulness 0.96 · 8/8 claims cited", "pass"],
        ["answer", "12 contracts renew in Q4. 3 changed payment terms [1][4][7].", ""]
      ]
    },
    {
      id: "diagnostic-captioning",
      rows: [
        ["user", "caption(chest_xray_0417.png)", ""],
        ["tool", "encode(image) → CNN ensemble → 4 concepts", "95ms"],
        ["tool", "neighbours(k=5) → similar training cases", "60ms"],
        ["plan", "InstructBLIP → 3 candidate captions", "1.1s"],
        ["check", "DMMCS-guided decoding + MedCLIP rerank", "best 1/3"],
        ["answer", "Chest radiograph showing right lower lobe consolidation.", ""]
      ]
    },
    {
      id: "doc-structuring",
      rows: [
        ["user", "structure(card_cancellation.docx)", ""],
        ["tool", "extract(layout) → 38 blocks, 2 tables", "1.2s"],
        ["plan", "classify → tree · inject 2 few-shot examples", "420ms"],
        ["tool", "map → CallScript via forced tool use", "2.4s"],
        ["warn", "validate → step 4 points to a missing outcome", "1 warning"],
        ["check", "repair ×1 → validate", "0 warnings"],
        ["answer", "final.md rendered · 9 steps, 3 branches", ""]
      ]
    }
  ];

  var trace = $("[data-trace]");
  if (trace) initTrace(trace);

  function initTrace(el) {
    var tabs = $(".trace-tabs", el);
    var list = $(".trace-rows", el);
    var stateEl = $("[data-trace-state]", el);
    var timeEl = $("[data-trace-time]", el);
    var active = 0, step = 0, timer = null, started = 0, visible = true, token = 0;

    SCENARIOS.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "trace-tab"; b.setAttribute("role", "tab");
      b.textContent = s.id;
      b.addEventListener("click", function () { play(i); });
      tabs.appendChild(b);
    });

    function rowEl(r) {
      var li = document.createElement("li");
      li.className = "trace-row"; li.setAttribute("data-k", r[0]);
      li.innerHTML = '<span class="k"></span><span class="t"></span><span class="m"></span>';
      li.children[0].textContent = r[0];
      li.children[1].textContent = r[1];
      li.children[2].textContent = r[2];
      return li;
    }

    function setTabs() {
      $$(".trace-tab", tabs).forEach(function (t, i) { t.setAttribute("aria-selected", String(i === active)); });
    }

    function play(i) {
      token++;
      clearTimeout(timer);
      active = i; step = 0; started = performance.now();
      list.innerHTML = "";
      el.classList.remove("is-done");
      setTabs();
      if (reduceMotion) {
        SCENARIOS[i].rows.forEach(function (r) { list.appendChild(rowEl(r)); });
        finish();
        return;
      }
      stateEl.textContent = "running";
      next(token);
    }

    function next(t) {
      if (t !== token) return;
      if (!visible || document.hidden) { timer = setTimeout(function () { next(t); }, 400); return; }
      var rows = SCENARIOS[active].rows;
      var prev = list.lastElementChild;
      if (prev) prev.classList.remove("is-live");
      if (step >= rows.length) { finish(); timer = setTimeout(function () { play((active + 1) % SCENARIOS.length); }, 4200); return; }
      var li = rowEl(rows[step]);
      if (step < rows.length - 1) li.classList.add("is-live");
      list.appendChild(li);
      timeEl.textContent = ((performance.now() - started) / 1000).toFixed(1) + "s";
      step++;
      timer = setTimeout(function () { next(t); }, step === 1 ? 900 : 650 + Math.random() * 450);
    }

    function finish() {
      el.classList.add("is-done");
      stateEl.textContent = "completed";
      if (reduceMotion) timeEl.textContent = "";
      else timeEl.textContent = ((performance.now() - started) / 1000).toFixed(1) + "s";
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(el);
    }
    play(0);
  }

  /* Command palette ------------------------------------------------------ */
  var dlg = $("[data-palette]");
  if (!dlg || typeof dlg.showModal !== "function") {
    $$("[data-palette-open]").forEach(function (b) { b.hidden = true; });
    return;
  }
  var input = $(".palette-input", dlg);
  var listEl = $(".palette-list", dlg);
  var go = function (id) { return function () { document.getElementById(id).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); }; };
  var open = function (url) { return function () { window.open(url, "_blank", "noopener"); }; };

  var COMMANDS = [
    { group: "Navigate", label: "Expertise", hint: "#expertise", run: go("expertise") },
    // { group: "Navigate", label: "Selected work", hint: "#work", run: go("work") },
    { group: "Navigate", label: "Experience", hint: "#experience", run: go("experience") },
    { group: "Navigate", label: "Publications", hint: "#research", run: go("research") },
    { group: "Navigate", label: "Contact", hint: "#contact", run: go("contact") },
    { group: "Actions", label: "View CV", hint: "cv", run: open("cv.html") },
    { group: "Actions", label: "Download CV", hint: "pdf", run: function () {
      var a = document.createElement("a");
      a.href = "assets/Marina_Samprovalaki_CV.pdf"; a.download = "";
      document.body.appendChild(a); a.click(); a.remove();
    } },
    { group: "Actions", label: "Copy email address", hint: "email", run: function () { copy("marina.samprovalaki@gmail.com", "Email copied"); } },
    { group: "Actions", label: "Toggle light / dark theme", hint: "theme", run: toggleTheme },
    { group: "Links", label: "GitHub", hint: "github.com", run: open("https://github.com/msamprovalaki") },
    { group: "Links", label: "LinkedIn", hint: "linkedin.com", run: open("https://www.linkedin.com/in/marina-samprovalaki/") },
    { group: "Links", label: "Google Scholar", hint: "scholar", run: open("https://scholar.google.com/citations?user=iRPZ3joAAAAJ&hl=en") }
  ];
  var filtered = COMMANDS, sel = 0;

  function render() {
    var q = input.value.trim().toLowerCase();
    filtered = COMMANDS.filter(function (c) { return !q || (c.label + " " + c.hint + " " + c.group).toLowerCase().indexOf(q) !== -1; });
    sel = Math.min(sel, Math.max(0, filtered.length - 1));
    listEl.innerHTML = "";
    if (!filtered.length) {
      var e = document.createElement("li"); e.className = "empty"; e.textContent = "No matches";
      listEl.appendChild(e); return;
    }
    var lastGroup = null;
    filtered.forEach(function (c, i) {
      if (c.group !== lastGroup) {
        var g = document.createElement("p"); g.className = "palette-group"; g.textContent = c.group;
        g.setAttribute("role", "presentation");
        listEl.appendChild(g); lastGroup = c.group;
      }
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === sel));
      li.innerHTML = "<span></span><small></small>";
      li.children[0].textContent = c.label;
      li.children[1].textContent = c.hint;
      li.addEventListener("mousemove", function () { if (sel !== i) { sel = i; mark(); } });
      li.addEventListener("click", function () { exec(i); });
      listEl.appendChild(li);
    });
  }
  function mark() {
    $$('[role="option"]', listEl).forEach(function (li, i) {
      li.setAttribute("aria-selected", String(i === sel));
      if (i === sel) li.scrollIntoView({ block: "nearest" });
    });
  }
  function exec(i) {
    var c = filtered[i];
    if (!c) return;
    dlg.close();
    c.run();
  }
  function openPalette() {
    if (dlg.open) return;
    input.value = ""; sel = 0; render();
    dlg.showModal();
    input.focus();
  }

  $$("[data-palette-open]").forEach(function (b) { b.addEventListener("click", openPalette); });
  input.addEventListener("input", function () { sel = 0; render(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % filtered.length; mark(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; mark(); }
    else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  document.addEventListener("keydown", function (e) {
    var typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); dlg.open ? dlg.close() : openPalette(); }
    else if (e.key === "/" && !typing && !dlg.open) { e.preventDefault(); openPalette(); }
  });
})();
