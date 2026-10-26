(function () {
  const KINDS = ["made", "found", "collected", "read", "heard"];
  // version tag from index.html (app.js?v=…), added to picture links so a
  // replaced picture shows up after a reload instead of the old saved copy
  const VER = (() => {
    const s = document.querySelector('script[src*="app.js"]');
    const m = s && s.getAttribute("src").match(/v=(\w+)/);
    return m ? "?v=" + m[1] : "";
  })();
  const $ = (s) => document.querySelector(s);
  // *word* in a title becomes italics
  // and ~word~ is crossed out
  const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/~([^~]+)~/g, "<s>$1</s>");
  const plain = (s) => String(s ?? "").replace(/[*~]/g, "");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (d) => {
    if (!d) return "";
    const [y, m, day] = String(d).split("-");
    return [day && +day, m && months[+m - 1], y].filter(Boolean).join(" ");
  };
  const pad = (n) => "No. " + String(n).padStart(3, "0");

  // catalogue number = order of arrival (the bottom of the list is No. 001)
  // hide: true keeps an entry in items.js but off the site
  const items = ITEMS.filter((it) => !it.hide).map((it, i) => {
    const o = { ...it, no: it.no || ITEMS.length - i };  // "no" in items.js fixes the number
    if (Array.isArray(it.images)) {
      const dir = it.folder || "";
      const ext = it.ext || ".webp";
      const pic = (f) => ({ full: dir + f + ext + VER, small: dir + f + "-small" + ext + VER });
      const norm = (e) => (typeof e === "string" ? { files: [e] } : e);
      o.photos = it.layout === "photos";
      o.series = it.images.map(norm).map((e) => ({
        title: e.title || "",
        text: e.text || "",
        place: e.place || "",
        label: e.label || "",
        source: e.source || "",
        contain: e.fit === "contain",
        sound: e.sound ? "sounds/" + e.sound + VER : "",
        pics: (e.files || (e.file ? [e.file] : [])).map(pic),
      }));
      const allFiles = it.images.map(norm).flatMap((e) => e.files || [e.file]);
      // a cover with its own extension ("x.png") is used as is, otherwise it is a picture of the series
      o.coverImgs = (it.cover || allFiles.slice(0, 8)).map((f) => (/\.\w+$/.test(f) ? { full: dir + f + VER, small: dir + f + VER } : pic(f)));
    }
    // a written piece: paragraphs instead of pictures
    if (it.layout === "text") {
      o.isText = true;
      o.body = it.body || [];
      o.series = [];
      o.coverImgs = (it.cover || []).map((f) => ({ small: (it.folder || "") + f + VER, full: (it.folder || "") + f + VER }));
    }
    // a list of quotes instead of pictures
    if (it.layout === "quotes") {
      o.isQuotes = true;
      o.quotes = (it.quotes || []).map((q) => (typeof q === "string" ? { text: q } : q));
      // pictures and videos can sit between the quotes: { video: "q1.mp4" } or { image: "q2.jpg" }
      o.quoteCount = o.quotes.filter((q) => q.text).length;
      o.mediaDir = it.folder || "";
      o.series = [];
      // cover: ["x.jpg"] puts a picture on the front-page card instead of the first quote
      o.coverImgs = (it.cover || []).map((f) => ({ small: (it.folder || "") + f + VER, full: (it.folder || "") + f + VER }));
    }
    return o;
  });
  // "first: true" in items.js puts an article at the front of the main page
  // without changing its number
  const series = items.filter((i) => i.series).sort((x, y) => (y.first ? 1 : 0) - (x.first ? 1 : 0));
  const singles = items.filter((i) => !i.series);

  document.title = SITE.title;
  ($("#site-title a") || $("#site-title")).textContent = SITE.title;
  $("#site-intro").textContent = SITE.intro;
  $("#about-text").innerHTML = (SITE.about || []).map((p) => `<p>${esc(p)}</p>`).join("");

  // ── front page ───────────────────────────────────────────────
  let filter = "all";

  function renderFilters() {
    const counts = { all: items.length };
    KINDS.forEach((k) => (counts[k] = items.filter((i) => i.kind === k).length));
    const opts = ["all", ...KINDS.filter((k) => counts[k] > 0)];
    $("#filters").innerHTML = opts
      .map((k) => `<button type="button" data-kind="${k}" aria-pressed="${k === filter}">${k === "all" ? "Everything" : k[0].toUpperCase() + k.slice(1)}<span>${counts[k]}</span></button>`)
      .join("");
  }

  const countLabel = (it) =>
    it.isText
      ? ""
      : it.isQuotes
      ? (it.quoteCount ? `  ·  ${it.quoteCount} ${it.quoteCount === 1 ? "quote" : "quotes"}` : "")
      : `  ·  ${it.series.length} ${it.photos ? "pictures" : "entries"}`;

  // front page card: one rectangle, the title and the number
  function featureHTML(it) {
    const pic = it.coverImgs[0];
    // showTitle: the title goes under the card and the box shows the first quote
    const firstQuote = it.isQuotes ? (it.quotes.find((q) => q.text) || {}).text || (it.quotes.some((q) => q.audio) ? "▶" : "") : "";
    const box = it.isQuotes && pic
      ? `<img src="${esc(pic.small)}" alt="" loading="lazy">`
      : it.isQuotes
      ? `<span class="card-quote${it.showTitle ? " small" : ""}">${esc(it.showTitle ? firstQuote : it.title)}</span>`
      : it.isText && !pic
      ? `<span class="card-quote">${esc(it.subtitle || it.title)}</span>`
      : pic
        ? `<img src="${esc(pic.small)}" alt="" loading="lazy">`
        : "";
    return `<a class="card" href="#${esc(it.slug)}" aria-label="${esc(it.title)}">
  <span class="card-box${(it.isQuotes && !pic) || (it.isText && !pic) ? " quote" : it.coverFill || ((it.photos || it.isQuotes) && !/\.(webp|png)$/i.test((it.cover || [""])[0])) ? "" : " cutout"}">${box}</span>
  ${it.isQuotes && !it.showTitle ? `<span class="card-title" aria-hidden="true">&nbsp;</span>` : `<span class="card-title">${esc(it.title)}</span>`}
  <span class="num">${pad(it.no)}</span>
</a>`;
  }

  let shown = [];
  function renderWall() {
    const match = (i) => filter === "all" || i.kind === filter;
    $("#features").innerHTML = series.filter(match).map(featureHTML).join("");
    shown = singles.filter(match);
    $("#wall").innerHTML = shown
      .map(
        (it, idx) => `<button type="button" class="item" data-idx="${idx}" aria-label="Open ${esc(it.title)}">
  <img src="${esc(it.image)}" alt="${esc(it.title)}" loading="lazy">
  <div class="meta"><span class="title">${esc(it.title)}</span><span class="kind">${esc(it.kind)}</span></div>
  <div class="meta"><span class="num">${pad(it.no)}</span><span class="date">${fmtDate(it.date)}</span></div>
</button>`
      )
      .join("");
    $("#empty").hidden = series.some(match) || shown.length > 0;
  }

  // ── series page ──────────────────────────────────────────────
  let openSeries = null;
  // big: "title" makes a picture exactly as wide as the article title
  function fitToTitle() {
    const t = $("#s-title"), figs = document.querySelectorAll(".quote-media.title-wide img");
    if (!figs.length || !t.firstChild) return;
    const r = document.createRange();
    r.selectNodeContents(t);
    const w = Math.round(r.getBoundingClientRect().width);
    figs.forEach((img) => (img.style.width = w + "px"));
  }
  window.addEventListener("resize", fitToTitle);
  if (document.fonts) document.fonts.ready.then(fitToTitle);

  // trail: true. Desktop: portraits drop under the mouse and float away after 3.5s.
  // Phones (no hover): prints are laid down one after another on a loose pile.
  let trailStop = null;
  function stopTrail() {
    if (trailStop) trailStop();
    trailStop = null;
    const box = $("#s-trail");
    box.hidden = true;
    box.innerHTML = "";
  }
  function startTrail(it) {
    const box = $("#s-trail"), pics = it.series.map((p) => p.pics[0]).filter(Boolean);
    if (!pics.length) return;
    box.hidden = false;
    const s = pics.findIndex((p) => p.full.includes("/" + (it.trailStart || "") + "."));
    let next = s < 0 ? 0 : s;
    const drop = (x, y, still, life) => {
      const d = document.createElement("div");
      d.className = "trail-pic" + (still ? " still" : "");
      d.style.cssText = `left:${x}px;top:${y}px;--r:${(Math.random() - 0.5) * (still ? 18 : 4)}deg;--fx:${(Math.random() - 0.5) * 12}px;--fy:${(Math.random() - 0.5) * 12}px`;
      d.innerHTML = `<img src="${esc(pics[next].small)}" alt="" draggable="false">`;
      next = (next + 1) % pics.length;
      box.appendChild(d);
      if (life) setTimeout(() => d.remove(), life);
      return d;
    };
    if (matchMedia("(hover: none)").matches) {
      const lay = () => {
        drop(box.clientWidth / 2 + (Math.random() - 0.5) * 120, box.clientHeight * 0.45 + (Math.random() - 0.5) * 140, true, 0);
        while (box.children.length > 40) box.firstChild.remove();
      };
      lay();
      const id = setInterval(lay, 1100);
      trailStop = () => clearInterval(id);
      return;
    }
    const first = drop(box.clientWidth / 2, box.clientHeight / 2, false, 0);
    let last = 0, firstGone = false;
    const move = (e) => {
      const now = Date.now();
      if (now - last < 400) return;
      last = now;
      if (!firstGone) { firstGone = true; setTimeout(() => first.remove(), 3500); }
      const r = box.getBoundingClientRect();
      drop(e.clientX - r.left, e.clientY - r.top, false, 3500);
    };
    box.addEventListener("mousemove", move);
    trailStop = () => box.removeEventListener("mousemove", move);
  }

  function renderSeries(it) {
    openSeries = it;
    stopTrail();
    $("#s-grid").classList.remove("zig", "free");
    $("#s-kind").textContent = it.kind;
    $("#s-title").textContent = it.title;
    $("#s-sub").textContent = it.subtitle || "";
    $("#s-sub").hidden = !it.subtitle;
    const d = it.dict;
    $("#s-title").classList.toggle("dict-word", !!d);
    $("#s-dict").hidden = !d;
    $("#s-dict").innerHTML = d
      ? `<p class="dict-pron"><span class="pos">${esc(d.pos || "")}</span>${d.uk ? ` <span class="lang">uk</span> ${esc(d.uk)}` : ""}${d.us ? ` <span class="lang">us</span> ${esc(d.us)}` : ""}</p><hr><p class="dict-def">${esc(d.def || "")}</p>`
      : "";
    $("#s-grid").classList.toggle("photos", !!it.photos);
    $("#s-grid").classList.toggle("quotes", !!it.isQuotes);
    $("#s-grid").classList.toggle("essay", !!it.isText);
    $("#s-grid").classList.toggle("wide", it.shape === "wide");
    $("#s-grid").classList.toggle("dense", !!it.trail);
    $("#s-grid").classList.toggle("large", it.size === "large");
    $("#s-grid").style.setProperty("--cols", it.cols || 3);
    $("#s-num").textContent = `${pad(it.no)}${countLabel(it)}${it.date ? "  ·  " + fmtDate(it.date) : ""}`;
    $("#s-note").textContent = it.note || "";
    $("#s-note").hidden = !it.note;
    const q = it.quote;
    $("#s-quote").hidden = !q;
    $("#s-quote").innerHTML = q
      ? `<blockquote>${esc(q.text)}</blockquote>${q.by || q.from ? `<figcaption>${esc(q.by || "")}${q.by && q.from ? ", " : ""}${q.from ? `<cite>${esc(q.from)}</cite>` : ""}</figcaption>` : ""}`
      : "";
    cardIdx = it.series.map(() => 0);
    if (it.isText) {
      // body: strings are paragraphs, { image: "x.webp" } sits between paragraphs.
      // collage: pictures scattered in the left and right margins, top to bottom.
      const rnd = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
      const dir = it.folder || "";
      // zigzag: paragraphs alternate left and right around a column of pictures
      if (it.zigzag) {
        const z = it.zigzag, spine = z.spine || [], n = z.repeat || 14;
        const pics = Array.from({ length: n }, (_, k) => {
          const f = spine[k % spine.length], tilt = n === 1 ? 0 : [-2, 1.5, -1, 3, 0, -3][k % 6], flip = k % 3 === 2 ? " scaleX(-1)" : "";
          return `<img src="${esc(dir + f + VER)}" alt="" loading="lazy" style="transform:rotate(${tilt}deg)${flip}">`;
        }).join("");
        const paras = it.body.filter((p) => typeof p === "string" || p.footnote);
        $("#s-grid").classList.add("zig");
        const txt = paras.filter((p) => typeof p === "string"), notes = paras.filter((p) => typeof p !== "string");
        const P = (p) => (typeof p === "string" ? `<p style="order:${txt.indexOf(p)}">${esc(p)}</p>` : `<p class="footnote" style="order:99">${rich(p.footnote)}</p>`);
        const L = txt.filter((_, k) => k % 2 === 0), R = txt.filter((_, k) => k % 2 === 1);
        $("#s-grid").innerHTML = `<div class="zig-text left">${L.map(P).join("")}${notes.map(P).join("")}</div><div class="zig-spine" aria-hidden="true"><div>${pics}</div></div><div class="zig-text right">${R.map(P).join("")}</div>`;
        return;
      }
      $("#s-grid").classList.remove("zig");
      const norm = (e) => (typeof e === "string" ? { file: e } : e);
      const col = (it.collage || []).map(norm);
      const sides = { left: col.filter((_, k) => k % 2 === 0), right: col.filter((_, k) => k % 2 === 1) };
      const collage = Object.entries(sides)
        .flatMap(([side, list]) =>
          list.map((e, k) => {
            const pin = e.top === "page" ? ' data-pin="top"' : "";
            // x, y, w in % place a picture exactly (x, w: % of the width; y: % of the height)
            if (e.x !== undefined)
              return `<img class="c-free"${pin} src="${esc(dir + e.file + VER)}" alt="" loading="lazy" style="left:${e.x}%;top:${e.y || 0}%;--fw:${e.w}%">`;
            const w = e.w || 180, j = rnd(e.file), j2 = rnd(e.file + "t");
            const top = (((k + 0.05 + j2 * 0.5) / list.length) * 78).toFixed(1);
            return `<img class="c-${side}"${pin} src="${esc(dir + e.file + VER)}" alt="" loading="lazy" style="--w:${w}px;--j:${j.toFixed(2)};top:${top}%">`;
          })
        )
        .join("");
      $("#s-grid").classList.toggle("free", col.some((e) => e.x !== undefined));
      $("#s-grid").innerHTML = `<div class="collage" aria-hidden="true">${collage}</div><div class="essay-text">${it.body
        .map((p) => (typeof p === "string" ? `<p>${esc(p)}</p>` : p.footnote ? `<p class="footnote">${rich(p.footnote)}</p>` : p.gap ? `<div class="essay-gap" style="height:${esc(p.gap)}">${(p.images || []).map(norm).map((e) => `<img src="${esc(dir + e.file + VER)}" alt="" loading="lazy" style="left:${e.x || 0}%;top:${e.y || 0}%;--fw:${e.w || 20}%">`).join("")}</div>` : `<figure class="essay-pic"><img src="${esc(dir + norm(p.image).file + VER)}" alt="" loading="lazy" style="width:${norm(p.image).w || 240}px"></figure>`))
        .join("")}</div>`;
      // top: "page" pins a picture to the very top of the page
      const pinTop = () =>
        document.querySelectorAll('.collage img[data-pin="top"]').forEach((img) => {
          const box = img.parentElement.getBoundingClientRect();
          img.style.top = getComputedStyle(img.parentElement).position === "absolute" ? -(box.top + window.scrollY) + "px" : "";
        });
      requestAnimationFrame(pinTop);
      window.onresize = pinTop;
      return;
    }
    if (it.isQuotes) {
      $("#s-grid").innerHTML = it.quotes.length
        ? it.quotes
            .map((q) => q.audio
              ? `<figure class="quote-audio"><button type="button" class="audio-btn" data-src="${esc("sounds/" + q.audio + VER)}" aria-label="Play">▶</button>${q.label ? `<figcaption>${rich(q.label)}</figcaption>` : ""}</figure>`
              : q.video
              ? `<figure class="quote-media${q.big ? " big" : ""}"><video src="${esc(it.mediaDir + q.video + VER)}"${q.poster ? ` poster="${esc(it.mediaDir + q.poster + VER)}"` : ""} autoplay muted loop playsinline${q.controls ? " controls" : ""}></video>${q.soundToggle ? `<button type="button" class="vid-sound" aria-label="Turn sound on" aria-pressed="false">🔇</button>` : ""}</figure>`
              : q.gallery
              ? `<div class="quote-gallery">${q.gallery.map((f) => `<img src="${esc((q.folder || it.mediaDir) + f.replace(/\.(\w+)$/, "-small.$1") + VER)}" data-full="${esc((q.folder || it.mediaDir) + f + VER)}" alt="" loading="lazy">`).join("")}</div>`
              : q.para
              ? `<p class="quote-para">${rich(q.para)}</p>`
              : q.link
              ? `<p class="quote-link"><a href="${esc(q.href)}" target="_blank" rel="noopener">${rich(q.link)}</a> ↗</p>`
              : q.image
              ? `<figure class="quote-media${q.big === "title" ? " title-wide" : q.big ? " big" : ""}"><img src="${esc(it.mediaDir + q.image + VER)}" alt="" loading="lazy"></figure>`
              : `<figure class="quote">
  <blockquote>${esc(q.text)}</blockquote>
  ${q.by || q.from ? `<figcaption>${esc(q.by || "")}${q.by && q.from ? ", " : ""}${q.from ? `<cite>${esc(q.from)}</cite>` : ""}</figcaption>` : ""}
</figure>`)
            .join("")
        : `<p class="empty">Quotes coming soon.</p>`;
      fitToTitle();
      return;
    }
    $("#s-grid").innerHTML = it.series
      .map(
        (p, k) => `<div class="cut" data-k="${k}">
  <button type="button" class="cut-open" aria-label="Open ${esc(plain(p.title) || it.title + " " + (k + 1))}">
    ${p.pics.length
      ? `<span class="cut-img${p.contain ? " contain" : ""}"><img src="${esc(p.pics[0].small)}" alt="${esc(plain(p.title) || it.title + " " + (k + 1))}" loading="lazy"></span>`
      : `<span class="cut-img cut-none"><span>${esc(p.text || "No image yet")}</span><span class="play">▶</span></span>`}
  </button>
  ${p.pics.length > 1 ? `<button type="button" class="flip prev" aria-label="Previous picture">&lsaquo;</button><button type="button" class="flip next" aria-label="Next picture">&rsaquo;</button>` : ""}
  <span class="cut-cap"><span>${rich(p.title)}${p.sound ? ` <span class="has-sound" title="Has sound">♪</span>` : ""}</span><span class="num">${p.pics.length > 1 ? `<span class="pos">1/${p.pics.length}</span>  ` : ""}${esc(p.label) || String(k + 1).padStart(2, "0")}</span></span>
</div>`
      )
      .join("");
    // wait one frame: the article is still hidden while it is being filled in, so the box has no size yet
    if (it.trail) requestAnimationFrame(() => { if (openSeries === it && !$("#series").hidden) startTrail(it); });
  }

  let cardIdx = [];
  function flipCard(card, step) {
    const k = +card.dataset.k, p = openSeries.series[k];
    cardIdx[k] = (cardIdx[k] + step + p.pics.length) % p.pics.length;
    card.querySelector(".cut-img img").src = p.pics[cardIdx[k]].small;
    const pos = card.querySelector(".pos");
    if (pos) pos.textContent = `${cardIdx[k] + 1}/${p.pics.length}`;
  }

  // ── routing: #ambulantes opens a series, #made etc. filter ──
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const s = series.find((i) => i.slug === h);
    closeViewer();
    if (!s) stopTrail();
    document.body.classList.toggle("bg-white", !!(s && s.bg === "white"));
    $("#about").hidden = h !== "about";
    if (h === "about") {
      openSeries = null;
      $("#home").hidden = true;
      $("#series").hidden = true;
      $("header").hidden = true;
      window.scrollTo(0, 0);
    } else if (s) {
      renderSeries(s);
      $("#home").hidden = true;
      $("header").hidden = true;
      $("#series").hidden = false;
      window.scrollTo(0, 0);
    } else {
      openSeries = null;
      filter = KINDS.includes(h) ? h : "all";
      renderFilters();
      renderWall();
      $("#series").hidden = true;
      $("header").hidden = false;
      $("#home").hidden = false;
    }
  }

  // ── viewer (works for single pictures and for series) ───────
  const viewer = $("#viewer");
  let list = [], current = 0;
  function showViewer(entries, idx) {
    list = entries;
    current = (idx + list.length) % list.length;
    const e = list[current];
    const img = $("#v-img");
    img.src = e.src;
    img.alt = plain(e.title);
    img.classList.toggle("cutout", !!e.cutout);
    const set = (id, v) => { const el = $(id); el.textContent = v || ""; el.hidden = !v; };
    set("#v-title", e.title);
    $("#v-title").innerHTML = rich(e.title);
    set("#v-num", e.sub);
    set("#v-kind", e.kind);
    set("#v-note", e.note);
    $("#v-count").textContent = `${current + 1}/${list.length}`;
    $(".v-info").hidden = !(e.title || e.note || e.sub || e.kind || e.source);
    const src = $("#v-source");
    src.hidden = !e.source;
    if (e.source) { src.href = e.source; src.textContent = e.source.replace(/^https?:\/\//, ""); }
    viewer.hidden = false;
    // a picture with a voice note plays it as soon as it opens
    audio.pause();
    if (e.sound) { audio.src = e.sound; audio.currentTime = 0; audio.play().catch(() => {}); }
    $("#v-close").focus();
  }
  const audio = new Audio();
  function closeViewer() { viewer.hidden = true; audio.pause(); }

  const singleEntries = () =>
    shown.map((it) => ({ src: it.image, title: it.title, kind: it.kind, note: it.note, source: it.source, sub: pad(it.no) + (it.date ? "  ·  " + fmtDate(it.date) : "") }));
  // every picture of every entry, in order, for stepping through in the viewer
  const seriesEntries = (it) =>
    it.series.flatMap((p, k) =>
      p.pics.map((pic, j) => ({
        src: pic.full,
        title: p.title,
        kind: "",
        cutout: !it.photos,
        note: p.text,
        sub: p.place,
        source: p.source,
        sound: j === 0 ? p.sound : "",
      }))
    );
  const flatIndex = (it, k) => it.series.slice(0, k).reduce((n, p) => n + p.pics.length, 0) + cardIdx[k];

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const k = b.dataset.kind;
    try { history.replaceState(null, "", k === "all" ? location.pathname : "#" + k); } catch (err) {}
    route();
  });
  $("#wall").addEventListener("click", (e) => {
    const b = e.target.closest(".item"); if (b) showViewer(singleEntries(), +b.dataset.idx);
  });
  $("#s-grid").addEventListener("click", (e) => {
    // play / pause buttons for sound clips
    const ab = e.target.closest(".audio-btn");
    if (ab) {
      const on = ab.classList.contains("on");
      document.querySelectorAll(".audio-btn.on").forEach((b) => { b.classList.remove("on"); b.textContent = "▶"; });
      audio.pause();
      if (!on) {
        if (!audio.src.includes(ab.dataset.src.split("?")[0])) audio.src = ab.dataset.src;
        audio.play().catch(() => {});
        ab.classList.add("on"); ab.textContent = "❚❚";
        audio.onended = () => { ab.classList.remove("on"); ab.textContent = "▶"; };
      }
      return;
    }
    // sound button on a looping video: mute / unmute
    const vs = e.target.closest(".vid-sound");
    if (vs) {
      const v = vs.parentNode.querySelector("video");
      v.muted = !v.muted;
      if (!v.muted) { audio.pause(); v.play().catch(() => {}); }
      vs.textContent = v.muted ? "🔇" : "🔊";
      vs.setAttribute("aria-pressed", String(!v.muted));
      vs.setAttribute("aria-label", v.muted ? "Turn sound on" : "Turn sound off");
      return;
    }
    // a photo in a quotes gallery opens big, and the arrows step through that gallery
    const gi = e.target.closest(".quote-gallery img");
    if (gi) {
      const imgs = [...gi.parentNode.querySelectorAll("img")];
      showViewer(imgs.map((im) => ({ src: im.dataset.full })), imgs.indexOf(gi));
      return;
    }
    const card = e.target.closest(".cut"); if (!card || !openSeries) return;
    if (e.target.closest(".flip")) { flipCard(card, e.target.closest(".next") ? 1 : -1); return; }
    const p = openSeries.series[+card.dataset.k];
    // an entry with only a voice note plays it right there
    if (e.target.closest(".cut-open") && !p.pics.length) {
      const playing = card.classList.contains("playing");
      document.querySelectorAll(".cut.playing").forEach((c) => c.classList.remove("playing"));
      audio.pause();
      if (!playing && p.sound) {
        audio.src = p.sound; audio.currentTime = 0; audio.play().catch(() => {});
        card.classList.add("playing");
        audio.onended = () => card.classList.remove("playing");
      }
      return;
    }
    if (e.target.closest(".cut-open")) showViewer(seriesEntries(openSeries), flatIndex(openSeries, +card.dataset.k));
  });
  $("#v-prev").onclick = () => showViewer(list, current - 1);
  $("#v-next").onclick = () => showViewer(list, current + 1);
  $("#v-close").onclick = closeViewer;
  viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.tagName === "FIGURE") closeViewer(); });
  document.addEventListener("keydown", (e) => {
    if (viewer.hidden) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowLeft") showViewer(list, current - 1);
    if (e.key === "ArrowRight") showViewer(list, current + 1);
  });
  window.addEventListener("hashchange", route);

  route();
})();
