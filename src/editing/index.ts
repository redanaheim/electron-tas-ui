import { PianoRoll } from "./inputs";

export const on_init = (): PianoRoll => {
  const main_table = $("#script_rows");
  const piano = new PianoRoll({
    contents: [],
    reference: main_table,
    jquery_document: $(document),
    navbar: $("#navbar"),
  });
  piano.add(null, 0);
  return piano;
};
