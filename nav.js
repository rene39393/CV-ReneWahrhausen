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
})();
