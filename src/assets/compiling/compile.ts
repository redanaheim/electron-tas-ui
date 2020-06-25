import { ParsedLine, last_index_of } from "./classes";

import { Preprocessor } from "./preprocess";

const sign_independent_ceil = function (float: number): number {
  if (Math.abs(float) < 1) return 0;
  else return Math.sign(float) * Math.ceil(Math.abs(float));
};
const make_stick_cartesian = function (
  polar_coords: [number, number]
): [number, number] {
  // [90, 100] => (100, 0)
  // angle from positive y axis and magnitude => cartesian coordinates
  // outside 32767 is illegal on controller
  if (Math.abs(polar_coords[1]) > 32767)
    polar_coords[1] = Math.sign(polar_coords[1]) * 32767;
  const angle = (polar_coords[0] * Math.PI) / 180;
  const x = polar_coords[1] * Math.sin(angle);
  const y = polar_coords[1] * Math.cos(angle);
  return [sign_independent_ceil(x), sign_independent_ceil(y)];
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
  empty(): boolean {
    // For checking if we should print the frame or not
    return (
      this.pressed_keys.length === 0 &&
      !this.lstick_pos.some((x) => x !== 0) &&
      !this.rstick_pos.some((x) => x !== 0)
    );
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
      if (pressed_keys.includes(script_line.keys_on[i])) {
        if (throw_errors) {
          throw new Error(
            `Frame ${script_line.frame.toString()}: cannot press ${
              script_line.keys_on[i]
            } as it is already pressed.`
          );
        } else {
          continue;
        }
      } else if (ControllerState.valid_keys.includes(script_line.keys_on[i])) {
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
const as_key = function (x: string): string {
  x = x.toUpperCase();
  switch (x) {
    case "ALL": {
      return x;
    }
    case "NONE": {
      return x;
    }
    default: {
      if (/^KEY_/.test(x)) {
        return x;
      } else {
        return `KEY_${x}`;
      }
    }
  }
};
const separate_brackets = function (parameter: any): Array<typeof parameter> {
  // ON{KEY,KEY,KEY} => ["KEY", "KEY", "KEY"]
  return parameter
    .split("{")
    .slice(1)
    .join("")
    .split("}")[0]
    .split(",")
    .map((x: string) => as_key(x));
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
          // turn no keys on
          to_return.keys_on = [];
          // opposite of [] is all keys; since raw{none} should leave no keys on, turn them all off
          to_return.keys_off = opposite_keys([], ControllerState.valid_keys);
        } else if (
          included_keys.map((x) => x.toLowerCase()).join("_") === "all"
        ) {
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
        if (!parameter) continue;
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
    const lines = script.split("\n").map((x) => x.replace(/[\r\n]/g, ""));
    const contents = new Preprocessor(lines); // just initializing object
    contents.do_all(); // actually preprocess
    const file_lines = contents.current_content;
    if (file_lines.length === 0) {
      if (throw_errors) {
        throw new Error("No valid lines were found.");
      }
      return script;
    }
    for (const line of file_lines) {
      // create list of frames where we need to update the controller, and what to do
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
    update_frames = premade_update_frames; // passed by programmatic scripts
  }
  if (update_frames.length === 0) {
    if (throw_errors) throw new Error("No valid lines were found.");
    return script;
  }
  const last_frame = update_frames[last_index_of(update_frames)].frame;
  // We use this instead of shift()ing because shift is very inefficient
  let next_update = update_frames[0].frame;
  let update_index = 0;
  for (let i = 1; i <= last_frame; i++) {
    if (next_update === i) {
      // are we on a frame where changes should be made?
      controller.update(update_frames[update_index], throw_errors || false);
      update_index++; // wait for next update frame
      if (update_index < update_frames.length) {
        next_update = update_frames[update_index].frame;
      }
    }
    if (controller.empty()) continue;
    compiled += controller.print(i) + "\r\n";
  }
  return compiled.trim();
};
