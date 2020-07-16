import { PianoRoll, PianoRollRow } from "./inputs";
import { parse_line } from "../assets/compiling/compile";
import { KeysList, StickPos } from "../assets/compiling/classes";
import { ipcRenderer } from "electron";

export const on_init = (): Promise<PianoRoll> => {
  ipcRenderer.send("open_requests", "ready");
  return new Promise((res, _rej) => {
    ipcRenderer.on("open_requests", (_e, data) => {
      if (!data.path) return;
      PianoRoll.from(
        data.path,
        {
          contents: [],
          jquery_document: $(document),
          navbar: $("#navbar"),
          reference: $("#script_rows"),
          no_add_row: true,
        },
        data.decompile
      ).then(
        piano_roll => res(piano_roll),
        reason => console.error(reason)
      );
    });
  });
};

export const class_exports = {
  PianoRoll: PianoRoll,
  PianoRollRow: PianoRollRow,
  parse_line: parse_line,
  KeysList: KeysList,
  StickPos: StickPos,
};
