import { ScriptFunction } from "../compile";
function repeat(script: any, reps: number) {
  let buffer: any[] = [];
  for (var i = 0; i < reps; i++) {
    for (var line of script) {
      buffer.push(line);
    }
  }
  return buffer;
}
let builtin_data = [
  {
    name: "CAPDIVE",
    internal_actions: ["1 ON{KEY_X}", "7 ON{KEY_ZL}", "1 ON{KEY_Y}"],
  },
  {
    name: "DIVE",
    internal_actions: ["1 ON{KEY_ZL}", "1 ON{KEY_Y}"],
  },
  {
    name: "SPIN",
    internal_actions: repeat(
      [
        "1 LSTICK{0,30000}",
        "1 LSTICK{90,30000}",
        "1 LSTICK{180,30000}",
        "1 LSTICK{270,30000}",
      ],
      13
    ),
  },
];
const construct_builtins = function () {
  let queue: ScriptFunction[] = [];
  for (var script of builtin_data) {
    queue.push(new ScriptFunction(script.name, script.internal_actions, false));
  }
  return queue;
};
export const SMOBuiltins = construct_builtins();
