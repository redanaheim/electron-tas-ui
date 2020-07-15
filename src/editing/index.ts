import { PianoRoll, PianoRollRow } from "./inputs";
import { parse_line } from "../assets/compiling/compile";
import { KeysList, StickPos } from "../assets/compiling/classes";

const file = [
  "// Project Data",
  "// switch_ip:192.168.86.35",
  "// flags:",
  "+ ON{X}",
  "1 ON{KEY_Y}",
  "3 OFF{KEY_Y}",
  "2 ON{KEY_DUP}",
  "1 ON{KEY_Y}",
  "3 OFF{KEY_Y}",
  "2 ON{KEY_DRIGHT}",
];

export const on_init = (): PianoRoll => {
  const main_table = $("#script_rows");
  const piano = PianoRoll.from(file, {
    contents: [],
    reference: main_table,
    jquery_document: $(document),
    navbar: $("#navbar"),
    no_add_row: true,
  });
  return piano;
};

export const class_exports = {
  PianoRoll: PianoRoll,
  PianoRollRow: PianoRollRow,
  parse_line: parse_line,
  KeysList: KeysList,
  StickPos: StickPos,
  file: file,
};
