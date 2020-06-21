import { PianoRoll } from "./inputs";

export const on_init = function (): void {
  const main_table = $("#script_rows");
  const piano = new PianoRoll([], main_table);
  piano.add(null, 0);
  piano.add(null);
  piano.initiate_events();
};
