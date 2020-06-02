export class ScriptFunction {
  name: string;
  internal_actions: string[];
  active: boolean;
  constructor(name: string, internal_actions: string[], active: boolean) {
    this.name = name;
    this.internal_actions = internal_actions;
    this.active = active;
  }
  static de_init = function (): ScriptFunction {
    return new ScriptFunction("", [], false);
  };
}
import { get_builtin } from "./compiling_builtins/builtin_names";
interface ScriptFunctionExports {
  functions: ScriptFunction[];
  new_file_content: string[];
}
export interface ParsedLine {
  frame: number;
  keys_on: string[];
  keys_off: string[];
  lstick_pos_polar: [number, number];
  rstick_pos_polar: [number, number];
  lstick_changes: boolean;
  rstick_changes: boolean;
}
const make_stick_cartesian = function (
  polar_coords: [number, number]
): [number, number] {
  // [90, 100] => (100, 0)
  // angle from positive y axis and magnitude => cartesian coordinates
  // outside 32767 is illegal on controller
  if (polar_coords[1] > 32767) polar_coords[1] = 32767;
  const angle = (polar_coords[0] * Math.PI) / 180;
  return [
    Math.round(polar_coords[1] * Math.sin(angle)),
    Math.round(polar_coords[1] * Math.cos(angle)),
  ];
};
const opposite_keys = function (raw: string[], valid_keys: string[]): string[] {
  // invert keys: get every key except the ones passed to the "raw" argument
  const to_return: string[] = [];
  for (let i = 0; i < 16; i++) {
    if (raw.includes(valid_keys[i]) === false) {
      to_return.push(valid_keys[i]);
    }
  }
  return to_return;
};
class ControllerState {
  static valid_keys = [
    "KEY_A",
    "KEY_B",
    "KEY_X",
    "KEY_Y",
    "KEY_L",
    "KEY_R",
    "KEY_ZL",
    "KEY_ZR",
    "KEY_PLUS",
    "KEY_MINUS",
    "KEY_DUP",
    "KEY_DDOWN",
    "KEY_DLEFT",
    "KEY_DRIGHT",
    "KEY_LSTICK",
    "KEY_RSTICK",
  ];
  frame: number;
  pressed_keys: string[];
  lstick_pos: [number, number];
  rstick_pos: [number, number];
  constructor() {
    this.frame = 1;
    this.lstick_pos = [0, 0];
    this.rstick_pos = [0, 0];
    this.pressed_keys = [];
  }
  print(frame: number): string {
    const keys_string =
      this.pressed_keys.length === 0 ? "NONE" : this.pressed_keys.join(";");
    return `${frame} ${keys_string} ${this.lstick_pos.join(
      ";"
    )} ${this.rstick_pos.join(";")}`;
  }
  update(script_line: ParsedLine, throw_errors?: boolean): void {
    if (throw_errors) {
      for (const key of script_line.keys_on.concat(script_line.keys_off)) {
        if (
          ControllerState.valid_keys
            .concat(["ALL", "NONE"])
            .includes(key.toUpperCase()) === false
        ) {
          throw new Error("Invalid key name: " + key);
        }
      }
    }
    this.frame = script_line.frame;
    const pressed_keys = this.pressed_keys;
    let new_pressed_keys: string[] = [];
    // Handle keys that should be on for this frame
    for (let i = 0; i < pressed_keys.length; i++) {
      if (
        script_line.keys_off.includes(pressed_keys[i]) === false &&
        ControllerState.valid_keys.includes(pressed_keys[i])
      ) {
        new_pressed_keys.push(pressed_keys[i]);
      }
    }
    for (let i = 0; i < script_line.keys_on.length; i++) {
      if (
        pressed_keys.includes(script_line.keys_on[i]) === false &&
        ControllerState.valid_keys.includes(script_line.keys_on[i])
      ) {
        new_pressed_keys.push(script_line.keys_on[i]);
      }
    }
    if (script_line.keys_on.includes("ALL")) {
      new_pressed_keys = opposite_keys([], ControllerState.valid_keys);
    } else if (script_line.keys_off.includes("ALL")) {
      new_pressed_keys = [];
    }
    this.pressed_keys = new_pressed_keys;
    // Handle control sticks
    const lstick_pos = make_stick_cartesian(script_line.lstick_pos_polar);
    const rstick_pos = make_stick_cartesian(script_line.rstick_pos_polar);
    if (script_line.lstick_changes === true) this.lstick_pos = lstick_pos;
    if (script_line.rstick_changes === true) this.rstick_pos = rstick_pos;
  }
}
const separate_brackets = function (parameter: any): Array<typeof parameter> {
  // ON{KEY,KEY,KEY} => ["KEY", "KEY", "KEY"]
  return parameter
    .split("{")
    .slice(1)
    .join("")
    .split("}")[0]
    .split(",")
    .map((x: string) => x.toUpperCase());
};
const separate_brackets_stick = function (parameter: any): [number, number] {
  // purely for the purpose of returning a dual number tuple
  return parameter
    .split("{")
    .slice(1)
    .join("")
    .split("}")[0]
    .split(",")
    .slice(0, 2)
    .map((x: string) => Number(x));
};
const get_script_functions = function (
  file_lines: string[]
): ScriptFunctionExports {
  // Loop through lines; find definition of functions and replace all instances of them
  let in_definition = false;
  let script_functions: ScriptFunction[] = [];
  let current_function = new ScriptFunction("", [], false);
  const new_file_content = [];
  for (let line of file_lines) {
    if (/^BUILTINS [a-zA-Z]+$/i.test(line)) {
      // Get name of requested builtin and then add all of those functions to script_functions
      script_functions = script_functions.concat(
        get_builtin(line.trim().toLowerCase().split("builtins ")[1])
      );
    }
    if (/^DEF [a-zA-Z]+ \{$/i.test(line)) {
      in_definition = true;
      current_function = new ScriptFunction(
        line.toLowerCase().split("def ")[1].split("{")[0].trim(),
        [],
        true
      );
    } else if (/^\}$/.test(line) && in_definition) {
      in_definition = false;
      if (current_function.active) {
        script_functions.push(current_function);
        current_function = ScriptFunction.de_init();
      }
    } else if (in_definition === true && current_function.active) {
      line = line.trim();
      if (/^([0-9]+|\+) .+$/.test(line) === false) continue; // ignore invalid lines
      current_function.internal_actions.push(line);
    } else if ((in_definition || current_function.active) === false) {
      new_file_content.push(line);
    }
  }
  return { functions: script_functions, new_file_content: new_file_content };
};
const preprocess = function (file_lines: string[]): string[] {
  const script_function_processed = get_script_functions(file_lines);
  const script_functions = script_function_processed.functions;
  const new_lines = script_function_processed.new_file_content;
  const return_lines: string[] = [];

  for (const line of new_lines) {
    if (/^[a-zA-Z]+$/.test(line)) {
      let matching_function: ScriptFunction | null = null;
      for (const script_function of script_functions) {
        if (script_function.name.toLowerCase() === line.toLowerCase()) {
          matching_function = script_function;
        }
      }
      if (matching_function !== null) {
        for (const function_line of matching_function.internal_actions) {
          return_lines.push(function_line);
        }
      } else {
        continue;
      }
    } else {
      if (/^([0-9]+|\+) .+$/.test(line) === false) continue; // ignore invalid lines
      return_lines.push(line);
    }
  }
  return return_lines;
};
const parse_line = function (
  line: string,
  last_frame: number,
  throw_errors?: boolean
): ParsedLine {
  const to_return: ParsedLine = {
    frame: 0,
    lstick_changes: false,
    rstick_changes: false,
    keys_on: [],
    keys_off: [],
    lstick_pos_polar: [0, 0],
    rstick_pos_polar: [0, 0],
  };
  const parameters = line.split(" ");
  // script can be started with a '+' as the line number
  if (parameters[0] == "+" && last_frame === 1) {
    to_return.frame = 1;
  } else if (/^[0-9]+$/.test(parameters[0])) {
    // frame number is a valid number
    to_return.frame = Number(parameters[0]) + last_frame;
  } else {
    if (throw_errors)
      throw new Error(`Invalid frame number - '${parameters[0]}'`);
    to_return.frame = last_frame + 1;
  }
  parameters.shift();
  for (let i = 0; i < parameters.length; i++) {
    const parameter = parameters[i];
    const keyword = parameter.split("{")[0];
    switch (keyword.toLowerCase()) {
      case "on": {
        to_return.keys_on = separate_brackets(parameter);
        break;
      }
      case "off": {
        to_return.keys_off = separate_brackets(parameter);
        break;
      }
      case "raw": {
        // turn off all others besides the ones included in brackets
        const included_keys = separate_brackets(parameter);
        if (included_keys.map((x) => x.toLowerCase()).join("_") === "none") {
          to_return.keys_on = [];
          to_return.keys_off = opposite_keys([], ControllerState.valid_keys);
        } else if (included_keys.map((x) => x.toLowerCase()) === ["all"]) {
          to_return.keys_on = opposite_keys([], ControllerState.valid_keys);
          to_return.keys_off = [];
        } else {
          to_return.keys_on = separate_brackets(parameter);
          to_return.keys_off = opposite_keys(
            separate_brackets(parameter),
            ControllerState.valid_keys
          );
        }
        break;
      }
      case "lstick": {
        // if dead is passed in, coordinates should be 0,0
        if (parameter.toLowerCase() === "lstick{dead}") {
          to_return.lstick_pos_polar = [0, 0];
        }
        const lstick_pos = separate_brackets_stick(parameter);
        if (lstick_pos.length > 2 && throw_errors)
          throw new Error(
            `Invalid parameter (too many stick values) - '${parameter}'`
          );
        while (lstick_pos.length > 2) lstick_pos.shift();
        to_return.lstick_pos_polar = lstick_pos;
        to_return.lstick_changes = true;
        break;
      }
      case "rstick": {
        if (parameter.toLowerCase() === "rstick{dead}") {
          to_return.rstick_pos_polar = [0, 0];
        }
        const rstick_pos = separate_brackets_stick(parameter);
        if (rstick_pos.length > 2 && throw_errors)
          throw new Error(
            `Invalid parameter (too many stick values) - '${parameter}'`
          );
        while (rstick_pos.length > 2) rstick_pos.shift();
        to_return.rstick_pos_polar = rstick_pos;
        to_return.rstick_changes = true;
        break;
      }
      default: {
        if (throw_errors) throw new Error(`Invalid parameter - '${parameter}'`);
        continue;
      }
    }
  }
  return to_return;
};
export const compile = function (
  script: string,
  throw_errors: boolean,
  no_script?: boolean,
  premade_update_frames?: ParsedLine[]
): string {
  let compiled = "";
  const controller = new ControllerState();
  let update_frames: ParsedLine[] = [];
  let current_frame = 1;
  if (!no_script) {
    const file_lines = preprocess(script.split("\n"));
    if (file_lines.length === 0) {
      if (throw_errors) {
        throw new Error("No valid lines were found.");
      }
      return script;
    }
    for (const line of file_lines) {
      if (/^([0-9]+|\+) .+$/.test(line) === false) continue; // no valid frame number found, ignore
      const parsed_line = parse_line(
        line,
        current_frame,
        throw_errors || false
      );
      current_frame = parsed_line.frame;
      update_frames.push(parsed_line);
    }
  } else {
    update_frames = premade_update_frames;
  }
  if (update_frames.length === 0) {
    if (throw_errors) throw new Error("No valid lines were found.");
    return script;
  }
  const last_frame = update_frames[update_frames.length - 1].frame;
  // We use this instead of shift()ing because shift is very inefficient
  let next_update = update_frames[0].frame;
  let update_index = 0;
  for (let i = 1; i <= last_frame; i++) {
    if (next_update === i) {
      controller.update(update_frames[update_index], throw_errors || false);
      update_index++;
      if (update_index < update_frames.length) {
        next_update = update_frames[update_index].frame;
      }
    }
    const printed_line = controller.print(i);
    if (/^[0-9]+ NONE 0;0 0;0$/i.test(printed_line) && i > 1) continue; // don't print empty lines, nx-TAS already ignores them
    compiled += printed_line + "\r\n";
  }
  return compiled;
};
