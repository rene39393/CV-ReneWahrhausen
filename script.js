// Langsames, weiches Scrollen zu den Bereichen
const DAUER = 1600; // Millisekunden

document.querySelectorAll('.menue a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
        const ziel = document.querySelector(link.getAttribute("href"));
        if (!ziel) return;
        e.preventDefault();

        const start = window.scrollY;
        const strecke = ziel.getBoundingClientRect().top;
        const startZeit = performance.now();

        function schritt(jetzt) {
            const t = Math.min((jetzt - startZeit) / DAUER, 1);
            const weich = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            window.scrollTo(0, start + strecke * weich);
            if (t < 1) requestAnimationFrame(schritt);
        }
        requestAnimationFrame(schritt);
    });
});

// Neuronales Netz im Hintergrund: Punkte driften leicht, blinken auf
// und verschieben sich beim Scrollen langsamer als der Inhalt (Parallaxe)
const leinwand = document.getElementById("netz");
const ctx = leinwand.getContext("2d");
const FARBEN = ["94, 231, 240", "139, 124, 255", "200, 230, 90"]; // Cyan, Lila, Limette
const PARALLAXE = 0.25;   // 0 = steht still, 1 = scrollt mit dem Inhalt
const ABSTAND = 150;      // max. Länge einer Verbindungslinie in px
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
let punkte = [], breite, hoehe, feldHoehe;

function aufbauen() {
    const dpr = window.devicePixelRatio || 1;
    breite = innerWidth;
    hoehe = innerHeight;
    leinwand.width = breite * dpr;
    leinwand.height = hoehe * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Feld so hoch, dass es beim Scrollen der ganzen Seite reicht
    const scrollbar = document.documentElement.scrollHeight - hoehe;
    feldHoehe = hoehe + scrollbar * PARALLAXE;
    const anzahl = Math.round((breite * feldHoehe) / 15000);

    punkte = Array.from({ length: anzahl }, () => ({
        x: Math.random() * breite,
        y: Math.random() * feldHoehe,
        r: 1 + Math.random() * 1.6,
        farbe: FARBEN[Math.floor(Math.random() * FARBEN.length)],
        phase: Math.random() * Math.PI * 2,
        tempo: 0.4 + Math.random() * 1.2,
        drift: Math.random() * Math.PI * 2,
    }));
}

function zeichnen(zeit) {
    const t = zeit / 1000;
    const versatz = scrollY * PARALLAXE;
    ctx.clearRect(0, 0, breite, hoehe);

    // aktuelle Bildschirmposition jedes Punkts (mit leichter Drift)
    const sichtbar = [];
    for (const p of punkte) {
        const x = p.x + Math.sin(t * 0.15 + p.drift) * 12;
        const y = p.y - versatz + Math.cos(t * 0.12 + p.drift) * 12;
        if (y > -ABSTAND && y < hoehe + ABSTAND) sichtbar.push({ p, x, y });
    }

    // Linien zwischen nahen Punkten
    ctx.lineWidth = 0.6;
    for (let i = 0; i < sichtbar.length; i++) {
        for (let j = i + 1; j < sichtbar.length; j++) {
            const a = sichtbar[i], b = sichtbar[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < ABSTAND) {
                ctx.strokeStyle = `rgba(110, 160, 200, ${0.22 * (1 - d / ABSTAND)})`;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }
    }

    // Punkte mit sanftem Aufblinken
    for (const { p, x, y } of sichtbar) {
        const welle = (Math.sin(t * p.tempo + p.phase) + 1) / 2;
        const blink = Math.pow(welle, 8);           // meist ruhig, kurz hell
        const alpha = 0.45 + 0.55 * blink;
        ctx.fillStyle = `rgba(${p.farbe}, ${alpha})`;
        ctx.shadowColor = `rgba(${p.farbe}, ${blink})`;
        ctx.shadowBlur = 10 * blink;
        ctx.beginPath();
        ctx.arc(x, y, p.r + blink, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (!ruhig) requestAnimationFrame(zeichnen);
}

aufbauen();
addEventListener("resize", aufbauen);
if (ruhig) addEventListener("scroll", () => zeichnen(0));
requestAnimationFrame(zeichnen);

// Timeline: Stationen gleiten beim Erreichen herein, die Linie füllt sich mit
const timelines = document.querySelectorAll(".timeline");
const beobachter = new IntersectionObserver(eintraege => {
    for (const e of eintraege) {
        if (e.isIntersecting) {
            e.target.classList.add("sichtbar");
            beobachter.unobserve(e.target);
        }
    }
}, { threshold: 0.2 });

timelines.forEach(timeline => {
    timeline.classList.add("animiert");
    timeline.querySelectorAll(".station").forEach(s => beobachter.observe(s));
});

function linienAktualisieren() {
    timelines.forEach(timeline => {
        const box = timeline.getBoundingClientRect();
        const anteil = (innerHeight * 0.7 - box.top) / box.height;
        timeline.style.setProperty("--fortschritt", Math.min(Math.max(anteil, 0), 1) * 100 + "%");
    });
}
addEventListener("scroll", linienAktualisieren, { passive: true });
addEventListener("resize", linienAktualisieren);
linienAktualisieren();

// Kompetenzen: Kacheln erscheinen nacheinander, Linien verbinden Nachbarn je Gruppe
const kompetenzen = document.querySelector(".kompetenzen");
if (kompetenzen) {
    kompetenzen.classList.add("animiert");
    const gruppenBeobachter = new IntersectionObserver(eintraege => {
        for (const e of eintraege) {
            if (!e.isIntersecting) continue;
            e.target.classList.add("sichtbar");
            e.target.querySelectorAll(".kachel").forEach((k, i) =>
                setTimeout(() => k.classList.add("sichtbar"), i * 120));
            gruppenBeobachter.unobserve(e.target);
        }
    }, { threshold: 0.2 });
    kompetenzen.querySelectorAll(".netzgruppe").forEach(g => gruppenBeobachter.observe(g));
}

function verbindungenZeichnen() {
    document.querySelectorAll(".netzgruppe").forEach(gruppe => {
        const svg = gruppe.querySelector(".verbindungen");
        const basis = gruppe.getBoundingClientRect();
        const mitten = [...gruppe.querySelectorAll(".kachel")].map(k => {
            const r = k.getBoundingClientRect();
            return { x: r.left - basis.left + r.width / 2, y: r.top - basis.top + r.height / 2, breite: r.width };
        });

        // in Zeilen einteilen (gleiche Höhe = gleiche Zeile)
        const zeilen = [];
        for (const m of mitten) {
            const zeile = zeilen.find(z => Math.abs(z[0].y - m.y) < 10);
            zeile ? zeile.push(m) : zeilen.push([m]);
        }

        const linien = [];
        zeilen.forEach((zeile, zi) => {
            zeile.forEach((m, i) => {
                if (zeile[i + 1]) linien.push([m, zeile[i + 1]]);          // rechter Nachbar
                const unten = zeilen[zi + 1]?.find(n => Math.abs(n.x - m.x) < m.breite / 2);
                if (unten) linien.push([m, unten]);                           // Nachbar darunter
            });
        });

        svg.innerHTML = linien
            .map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`)
            .join("");
    });
}
addEventListener("resize", verbindungenZeichnen);
document.fonts.ready.then(verbindungenZeichnen);
verbindungenZeichnen();
