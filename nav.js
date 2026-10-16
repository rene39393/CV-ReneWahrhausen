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
    const BAND_AB = 1100;              // angedockt: ab hier senkrechtes Band mit Links
    let angedockt = false;

    function layoutSetzen() {
        leiste.classList.toggle("angedockt", angedockt);
        leiste.classList.toggle("kompakt",
            innerWidth <= KOMPAKT_BIS || (angedockt && innerWidth < BAND_AB));
    }

    // Wechsel: oben weich ausblenden, Layout umstellen, an neuer Stelle hereingleiten
    function andocken(neu) {
        if (neu === angedockt) return;
        angedockt = neu;
        aufklapper.filter(istOffen).forEach(a => umschalten(a, false));
        leiste.getAnimations().forEach(a => a.cancel());

        if (ruhig.matches || !leiste.animate) {
            layoutSetzen();
            return;
        }
        const weg = neu ? "0 -16px" : "16px 0";
        const her = neu ? "24px 0" : "0 -16px";
        const raus = leiste.animate(
            [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: weg }],
            { duration: 200, easing: "ease-in", fill: "forwards" });
        let erledigt = false;
        const umstellen = () => {
            if (erledigt || angedockt !== neu) return;
            erledigt = true;
            layoutSetzen();
            leiste.animate(
                [{ opacity: 0, translate: her }, { opacity: 1, translate: "0 0" }],
                { duration: 420, easing: "cubic-bezier(.2, .8, .2, 1)" });
            raus.cancel();
        };
        raus.onfinish = umstellen;
        // Absicherung, falls der Browser Animationen pausiert (Hintergrund-Tab)
        setTimeout(umstellen, 260);
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
            // Startseite verlassen: ihr unteres Ende liegt über 40 % der Fensterhöhe
            // (zurück erst ab 50 %, damit es an der Grenze nicht flackert)
            const unten = start ? start.getBoundingClientRect().bottom : 0;
            if (!angedockt && unten < innerHeight * 0.4) andocken(true);
            else if (angedockt && unten > innerHeight * 0.5) andocken(false);
            abschnittMarkieren();
        });
    }

    addEventListener("scroll", beimScrollen, { passive: true });
    addEventListener("resize", () => { layoutSetzen(); beimScrollen(); });

    // Startzustand ohne Animation (z. B. beim Neuladen mitten auf der Seite)
    angedockt = start ? start.getBoundingClientRect().bottom < innerHeight * 0.4 : false;
    layoutSetzen();
    abschnittMarkieren();
})();
