import { SMOBuiltins } from "./smo";
import { ScriptFunction } from "../compiling/classes";
export const get_builtin = function (name: string): ScriptFunction[] {
  switch (name.toLowerCase()) {
    case "smo": {
      return SMOBuiltins;
    }
    case "supermarioodyssey": {
      return SMOBuiltins;
    }
    default: {
      return [];
    }
  }
};
