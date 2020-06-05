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
      "Spins the control stick around a single time, going to 3 positions.",
    internal_actions: [
      "1 LSTICK{0,32767}",
      "1 LSTICK{120,32767}",
      "1 LSTICK{240,32767}",
    ],
  },
  {
    name: "MASH",
    description: "Alternates pressing A and B for 10 frames.",
    internal_actions: repeat(
      ["1 ON{KEY_A} OFF{KEY_B}", "1 OFF{KEY_A} ON{KEY_B}"],
      5
    ),
  },
  {
    name: "MASHPLUS",
    description: "Alternates pressing the + button for 10 frames.",
    internal_actions: repeat(["1 ON{KEY_PLUS}", "1 OFF{KEY_PLUS}"], 5),
  },
  {
    name: "BACKFLIP",
    description:
      "Performs a backflip. This can also be used while rolling or walking to long jump.",
    internal_actions: ["1 ON{KEY_ZL}", "1 ON{KEY_A}"],
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
