import { PianoRoll } from "./inputs";

export const on_init = function (): PianoRoll {
  const main_table = $("#script_rows");
  const piano = new PianoRoll([], main_table, $(document));
  piano.add(null, 0);
  piano.add(null);
  piano.add(null);
  piano.add(null);
  piano.add(null);
  piano.add(null);
  piano.add(null);
  piano.add(null);
  piano.remove(3);
  piano.refresh();
  return piano;
};
