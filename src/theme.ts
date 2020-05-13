import { Store } from "./storing";
async function set_theme(doc: Document) {
  let theme = await new Store("config", {
    theme: "dark",
    is_default: true,
  }).get("theme");
  if (doc.body.classList.length === 0) {
    doc.body.classList.add(theme);
  } else {
    doc.body.classList.replace(theme === "dark" ? "light" : "dark", theme);
  }
}
set_theme(document);
window.set_theme = set_theme;
