import { SMOBuiltins } from "./smo";
export const get_builtin = function (name: string) {
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
