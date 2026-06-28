/** Prevent input blur before dropdown option click (combobox pattern). */
export function keepFocusOnPointerDown(e: { preventDefault: () => void }) {
  e.preventDefault();
}
