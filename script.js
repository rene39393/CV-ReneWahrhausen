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
