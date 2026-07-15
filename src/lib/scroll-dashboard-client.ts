const DASHBOARD_MAIN_SELECTOR = "[data-dashboard-scroll]";

/** Scroll dashboard main content and window to top when either is scrolled. */
export function scrollDashboardToTop() {
  const main = document.querySelector<HTMLElement>(DASHBOARD_MAIN_SELECTOR);
  if (main && main.scrollTop > 0) {
    main.scrollTo({ top: 0 });
  }
  if (window.scrollY > 0) {
    window.scrollTo({ top: 0 });
  }
}

/** Scroll after DOM updates (e.g. view swap after save). */
export function scrollDashboardToTopAfterPaint() {
  scrollDashboardToTop();
  requestAnimationFrame(() => scrollDashboardToTop());
}
