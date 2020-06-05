import { ScriptFunction } from "../compiling/compile";
function repeat(script: any, reps: number): any[] {
  const buffer: any[] = [];
  for (let i = 0; i < reps; i++) {
    for (const line of script) {
      buffer.push(line);
    }
  }
  return buffer;
}
const builtin_data = [
  {
    name: "CAPDIVE",
    description:
      "Performs a frame-perfect dive onto cappy. Macro ends on the first frame of diving.",
    internal_actions: ["1 ON{KEY_X}", "7 ON{KEY_ZL}", "1 ON{KEY_Y}"],
  },
  {
    name: "DIVE",
    description: "Performs a perfect dive.",
    internal_actions: ["1 ON{KEY_ZL}", "1 ON{KEY_Y}"],
  },
  {
    name: "SPIN",
    description:
      "Spins the control stick around 13 times, going to 4 positions each time.",
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
const construct_builtins = function (): ScriptFunction[] {
  const queue: ScriptFunction[] = [];
  for (const script of builtin_data) {
    queue.push(
      new ScriptFunction(
        script.name,
        script.internal_actions,
        false,
        script.description || null
      )
    );
  }
  return queue;
};
export const SMOBuiltins = construct_builtins();
