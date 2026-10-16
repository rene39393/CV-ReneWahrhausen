// Glas-Navigationsleiste: Kontaktkarte und kompaktes Menü öffnen/schließen.
// Schließen per erneutem Klick, Klick außerhalb oder Escape-Taste.
(() => {
    const leiste = document.querySelector(".navleiste");
    if (!leiste) return;

    const kontaktKnopf = leiste.querySelector("#kontakt-knopf");
    const kontaktkarte = leiste.querySelector("#kontaktkarte");
    const menueKnopf = leiste.querySelector(".nav-menue-knopf");
    const links = leiste.querySelector(".nav-links");

    // Jedes Aufklapp-Element: Knopf, Bereich und wie es sichtbar gemacht wird
    const aufklapper = [
        {
            knopf: kontaktKnopf,
            bereich: kontaktkarte,
            setzen: offen => kontaktkarte.classList.toggle("offen", offen),
            fokusZiel: kontaktkarte,
        },
        {
            knopf: menueKnopf,
            bereich: links,
            setzen: offen => leiste.classList.toggle("kompakt-offen", offen),
            fokusZiel: links.querySelector("a"),
        },
    ];

    requestAnimationFrame(() => requestAnimationFrame(() => leiste.classList.add("bereit")));
    // Einblend-Animation beim Laden nicht bei späteren Klassenwechseln wiederholen
    leiste.addEventListener("animationend", () => leiste.classList.add("eingeblendet"), { once: true });

    const istOffen = a => a.knopf.getAttribute("aria-expanded") === "true";

    function umschalten(a, offen, fokusZurueck = false) {
        a.knopf.setAttribute("aria-expanded", String(offen));
        a.setzen(offen);
        if (offen) {
            aufklapper.filter(b => b !== a && istOffen(b)).forEach(b => umschalten(b, false));
            a.fokusZiel.focus({ preventScroll: true });
        } else if (fokusZurueck) {
            a.knopf.focus();
        }
    }

    for (const a of aufklapper) {
        a.knopf.addEventListener("click", () => umschalten(a, !istOffen(a)));
    }

    // Klick außerhalb schließt
    document.addEventListener("click", e => {
        for (const a of aufklapper) {
            if (istOffen(a) && !a.bereich.contains(e.target) && !a.knopf.contains(e.target)) {
                umschalten(a, false);
            }
        }
    });

    // Escape schließt und gibt den Fokus an den Knopf zurück
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        for (const a of aufklapper) {
            if (istOffen(a)) umschalten(a, false, true);
        }
    });

    // Fokus verlässt die Kontaktkarte per Tab: schließen
    kontaktkarte.addEventListener("focusout", e => {
        const a = aufklapper[0];
        if (istOffen(a) && e.relatedTarget && !kontaktkarte.contains(e.relatedTarget) && e.relatedTarget !== kontaktKnopf) {
            umschalten(a, false);
        }
    });

    // Im kompakten Menü schließt die Auswahl eines Links das Menü
    links.addEventListener("click", e => {
        if (e.target.closest("a") && istOffen(aufklapper[1])) umschalten(aufklapper[1], false);
    });

    // --- Scroll-Verhalten: oben auf der Startseite, danach rechts angedockt ---
    const start = document.querySelector(".start");
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
    const KOMPAKT_BIS = 820;           // darunter immer Menü-Knopf
    const LEISTE_MIN_HOEHE = 700;      // angedockt: darunter passen die gedrehten Begriffe nicht
    let angedockt = false;

    function layoutSetzen() {
        leiste.classList.toggle("angedockt", angedockt);
        leiste.classList.toggle("kompakt",
            innerWidth <= KOMPAKT_BIS || (angedockt && innerHeight < LEISTE_MIN_HOEHE));
    }

    // --- Scrollgekoppelte Verwandlung: Leiste oben -> Seitenleiste rechts ---
    // fortschritt 0 = oben, 1 = angedockt; ergibt sich direkt aus der Scrollposition,
    // folgt also dem Scrolltempo und läuft beim Zurückscrollen rückwärts.
    const WEG = 0.6;                   // Verwandlung über 60 % der Fensterhöhe Scrollweg
    let masse = null;                  // gemessene Start- und Endlage (Cache)
    let verwandelt = false;

    function fortschrittBerechnen() {
        if (!start) return 1;
        const unten = start.getBoundingClientRect().bottom;
        const p = (innerHeight - unten) / (innerHeight * WEG);
        // an den Enden einrasten (Rundung beim Scrollen soll keinen Zwischenzustand lassen)
        return p < 0.02 ? 0 : p > 0.98 ? 1 : p;
    }

    function inlineLoeschen() {
        for (const k of ["left", "top", "right", "bottom", "width", "height", "transform", "borderRadius", "--inhalt"]) {
            leiste.style.removeProperty(k.startsWith("--") ? k : k.replace(/[A-Z]/g, m => "-" + m.toLowerCase()));
        }
    }

    // Lage und Rundung beider Endzustände messen (ohne Inline-Werte)
    function messen() {
        const war = angedockt;
        leiste.getAnimations().forEach(x => x.finish());
        leiste.classList.remove("verwandelt");
        inlineLoeschen();
        const lage = dock => {
            angedockt = dock;
            layoutSetzen();
            const r = leiste.getBoundingClientRect();
            return { x: r.left, y: r.top, b: r.width, h: r.height,
                     rund: parseFloat(getComputedStyle(leiste).borderTopLeftRadius) || 0 };
        };
        masse = { oben: lage(false), unten: lage(true) };
        angedockt = war;
        layoutSetzen();
    }

    const mischen = (a, b, t) => a + (b - a) * t;
    const weich = t => t * t * (3 - 2 * t);    // sanft an- und auslaufend

    function anwenden(p) {
        // Bewegung reduziert: ohne Verwandlung umschalten (mit etwas Abstand gegen Flackern)
        if (ruhig.matches) {
            const neu = p >= 1 ? true : p < 0.8 ? false : angedockt;
            if (neu !== angedockt) {
                aufklapper.filter(istOffen).forEach(x => umschalten(x, false));
                angedockt = neu;
                layoutSetzen();
            }
            return;
        }

        if (p <= 0 || p >= 1) {
            if (verwandelt || angedockt !== (p >= 1)) {
                verwandelt = false;
                leiste.classList.remove("verwandelt");
                inlineLoeschen();
                angedockt = p >= 1;
                layoutSetzen();
            }
            return;
        }

        if (!verwandelt) {
            aufklapper.filter(istOffen).forEach(x => umschalten(x, false));
            leiste.classList.add("eingeblendet");
            if (!masse) messen();
            verwandelt = true;
            leiste.classList.add("verwandelt");
        }

        // Klassen wechseln in der Mitte, wenn der Inhalt ausgeblendet ist
        const dock = p >= 0.5;
        if (dock !== angedockt) {
            angedockt = dock;
            layoutSetzen();
        }

        // Mittelpunkt gleitet sanft; Breite schrumpft früh, Höhe wächst spät:
        // so wandert eine kleine Kapsel nach rechts und streckt sich erst am Ziel
        const t = weich(p), { oben: o, unten: u } = masse;
        const b = mischen(o.b, u.b, 1 - (1 - p) ** 3);
        const h = mischen(o.h, u.h, p ** 3);
        const mx = mischen(o.x + o.b / 2, u.x + u.b / 2, t);
        const my = mischen(o.y + o.h / 2, u.y + u.h / 2, t);
        const st = leiste.style;
        st.left = mx - b / 2 + "px";
        st.top = my - h / 2 + "px";
        st.width = b + "px";
        st.height = h + "px";
        st.right = "auto";
        st.bottom = "auto";
        st.transform = "none";
        st.borderRadius = Math.min(mischen(o.rund, u.rund, t), b / 2, h / 2) + "px";
        // alter Inhalt bis 30 % ausblenden, neuer ab 70 % einblenden
        st.setProperty("--inhalt", p < 0.5 ? Math.max(0, 1 - p / 0.3) : Math.max(0, (p - 0.7) / 0.3));
    }

    // Aktuellen Abschnitt im Menü markieren
    const linkZiele = [...links.querySelectorAll('a[href^="#"]')]
        .map(a => ({ a, ziel: document.querySelector(a.getAttribute("href")) }))
        .filter(z => z.ziel);

    function abschnittMarkieren() {
        const linie = innerHeight * 0.4;
        let aktuell = null;
        for (const z of linkZiele) {
            if (z.ziel.getBoundingClientRect().top <= linie) aktuell = z;
        }
        for (const z of linkZiele) {
            if (z === aktuell) z.a.setAttribute("aria-current", "location");
            else z.a.removeAttribute("aria-current");
        }
    }

    let geplant = false;
    function beimScrollen() {
        if (geplant) return;
        geplant = true;
        requestAnimationFrame(() => {
            geplant = false;
            anwenden(fortschrittBerechnen());
            abschnittMarkieren();
        });
    }

    addEventListener("scroll", beimScrollen, { passive: true });
    addEventListener("resize", () => {
        masse = null;                  // Lagen neu messen
        if (verwandelt) { verwandelt = false; leiste.classList.remove("verwandelt"); inlineLoeschen(); }
        layoutSetzen();
        beimScrollen();
    });

    // Startzustand (z. B. beim Neuladen mitten auf der Seite)
    angedockt = fortschrittBerechnen() >= 1;
    layoutSetzen();
    anwenden(fortschrittBerechnen());
    abschnittMarkieren();
})();
