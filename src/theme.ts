import { Store, store_defaults } from "./storing";
/**
 * Retrieves the theme from app_dir/config.json, then updates the `body` class to match.
 * @param doc Document object for the window
 */
export async function set_theme(doc: Document): Promise<void> {
  const theme = await Store.value_of("config", "theme", store_defaults.config);
  if (doc.body.classList.length === 0) {
    doc.body.classList.add(theme);
  } else {
    doc.body.classList.replace(theme === "dark" ? "light" : "dark", theme);
  }
}
set_theme(document).then(
  () => void 0,
  reason => console.error(reason)
);
