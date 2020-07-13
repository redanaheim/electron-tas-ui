import { PianoRoll, PianoRollRow } from "./inputs";
import { parse_line } from "../assets/compiling/compile";
import { KeysList, StickPos } from "../assets/compiling/classes";
import { request_prompt } from "../assets/prompts/prompt_renderer";

export const on_init = (): PianoRoll => {
  const main_table = $("#script_rows");
  const piano = new PianoRoll({
    contents: [],
    reference: main_table,
    jquery_document: $(document),
    navbar: $("#navbar"),
  });
  return piano;
};

export const class_exports = {
  PianoRoll: PianoRoll,
  PianoRollRow: PianoRollRow,
  parse_line: parse_line,
  KeysList: KeysList,
  StickPos: StickPos,
  request_prompt: request_prompt,
};
