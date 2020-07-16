/**
 * Truncates number before the decimal
 * @param float Number to take in and convert to integer
 */
export const Int = function (float: number): number {
  return Math[float >= 0 ? "floor" : "ceil"](float);
};
export const FifteenBitInt = function (float: number): number {
  return Math.abs(float) > 32767 ? Math.sign(float) * 32767 : Int(float);
};

export class FileLike {
  is_string = false;
  contents: string | string[] = [];
  constructor(data: string | string[]) {
    if (typeof data === "string") {
      this.is_string = true;
      this.contents = data;
    } else if (data instanceof Array) {
      this.is_string = false;
      this.contents = data;
    }
  }
  join(other: FileLike): FileLike {
    return new FileLike(this.as_array().concat(other.as_array()));
  }
  as_string(): string {
    if (this.is_string && typeof this.contents === "string") {
      return this.contents;
    } else if (this.contents instanceof Array) {
      return this.contents.join("\n");
    }
  }
  as_array(): string[] {
    if (this.is_string && typeof this.contents === "string") {
      return this.contents.split(/(?:\r\n|\r|\n)/);
    } else if (this.contents instanceof Array) {
      return this.contents;
    }
  }
}

export interface ScriptFunctionExports {
  functions: ScriptFunction[];
}

/**
 * Represents a macro in a Better Scripts script
 */
export class ScriptFunction {
  name: string;
  internal_actions: string[];
  active: boolean;
  description?: string;
  constructor(
    name: string,
    internal_actions: string[],
    active: boolean,
    description?: string
  ) {
    this.name = name;
    this.internal_actions = internal_actions;
    this.active = active;
    if (description) this.description = description;
  }
  static de_init = function (): ScriptFunction {
    return new ScriptFunction("", [], false);
  };
}

/**
 * Repeats an array
 * @param script Array of lines
 * @param reps Number of times to repeat
 */
export function repeat(script: string[], reps: number): any[] {
  const buffer: any[] = [];
  for (let i = 0; i < reps; i++) {
    for (const line of script) {
      buffer.push(line);
    }
  }
  return buffer;
}

/**
 * Represents the actions that should be taken from a specific line in a Better Scripts script
 */
export interface ParsedLine {
  frame: number;
  keys_on: string[];
  keys_off: string[];
  lstick_pos_polar: [number, number];
  rstick_pos_polar: [number, number];
  lstick_changes: boolean;
  rstick_changes: boolean;
}

export const last_index_of = function (array: any[]): number {
  return array.length - 1;
};

export enum Key {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  DLEFT = 4,
  DUP = 5,
  DDOWN = 6,
  DRIGHT = 7,
  L = 8,
  R = 9,
  ZL = 10,
  ZR = 11,
  PLUS = 12,
  MINUS = 13,
  LSTICK = 14,
  RSTICK = 15,
  NONE = 16,
}
export const key_to_string = function (key: Key): string {
  switch (key) {
    case Key.A: {
      return "KEY_A";
    }
    case Key.B: {
      return "KEY_B";
    }
    case Key.X: {
      return "KEY_X";
    }
    case Key.Y: {
      return "KEY_Y";
    }
    case Key.DLEFT: {
      return "KEY_DLEFT";
    }
    case Key.DUP: {
      return "KEY_DUP";
    }
    case Key.DDOWN: {
      return "KEY_DDOWN";
    }
    case Key.DRIGHT: {
      return "KEY_DRIGHT";
    }
    case Key.L: {
      return "KEY_L";
    }
    case Key.R: {
      return "KEY_R";
    }
    case Key.ZL: {
      return "KEY_ZL";
    }
    case Key.ZR: {
      return "KEY_ZR";
    }
    case Key.PLUS: {
      return "KEY_PLUS";
    }
    case Key.MINUS: {
      return "KEY_MINUS";
    }
    case Key.LSTICK: {
      return "KEY_LSTICK";
    }
    case Key.RSTICK: {
      return "KEY_RSTICK";
    }
    default: {
      return void 0;
    }
  }
};

export const string_to_key = function (key: string | Key): Key {
  if (typeof key !== "string") {
    return key;
  }
  switch (key) {
    case "KEY_A": {
      return Key.A;
    }
    case "KEY_B": {
      return Key.B;
    }
    case "KEY_X": {
      return Key.X;
    }
    case "KEY_Y": {
      return Key.Y;
    }
    case "KEY_DLEFT": {
      return Key.DLEFT;
    }
    case "KEY_DUP": {
      return Key.DUP;
    }
    case "KEY_DDOWN": {
      return Key.DDOWN;
    }
    case "KEY_DRIGHT": {
      return Key.DRIGHT;
    }
    case "KEY_L": {
      return Key.L;
    }
    case "KEY_R": {
      return Key.R;
    }
    case "KEY_ZL": {
      return Key.ZL;
    }
    case "KEY_ZR": {
      return Key.ZR;
    }
    case "KEY_PLUS": {
      return Key.PLUS;
    }
    case "KEY_MINUS": {
      return Key.MINUS;
    }
    case "KEY_LSTICK": {
      return Key.LSTICK;
    }
    case "KEY_RSTICK": {
      return Key.RSTICK;
    }
    case "KEY_NONE": {
      return Key.NONE;
    }
    case "NONE": {
      return Key.NONE;
    }
    default: {
      return void 0;
    }
  }
};

export class KeysList {
  internal_set: Set<Key> = new Set();
  static all_keys: Key[] = [
    Key.A,
    Key.B,
    Key.X,
    Key.Y,
    Key.DLEFT,
    Key.DUP,
    Key.DDOWN,
    Key.DRIGHT,
    Key.L,
    Key.R,
    Key.ZL,
    Key.ZR,
    Key.PLUS,
    Key.MINUS,
    Key.LSTICK,
    Key.RSTICK,
  ];
  constructor(internal_array?: Key[]) {
    this.internal_set = new Set(internal_array);
  }
  append(key: Key): void {
    if (key === Key.NONE) return;
    this.internal_set.add(key);
  }
  append_list(key_list: Key[]): void {
    for (const key of key_list) {
      if (key === Key.NONE) continue;
      this.internal_set.add(key);
    }
  }
  remove(key: Key): void {
    this.internal_set.delete(key);
  }
  remove_list(key_list: Key[]): void {
    const new_internal_array: Set<Key> = new Set();
    for (const existing_key of this.internal_set) {
      if (!key_list.includes(existing_key)) {
        new_internal_array.add(existing_key);
      }
    }
    this.internal_set = new_internal_array;
  }
  length(): number {
    return this.internal_set.size;
  }
  clear(): void {
    this.internal_set.clear();
  }
  empty(): boolean {
    return this.internal_set.size === 0;
  }
  get_array(): string[] {
    return [...this.internal_set].map(x => key_to_string(x));
  }
  equals(other: KeysList): boolean {
    for (const key of this.internal_set) {
      if (!other.internal_set.has(key)) return false;
    }
    return true;
  }
  has(key: Key): boolean {
    if (key === Key.NONE) return true;
    return this.internal_set.has(key);
  }
  clone(): KeysList {
    return new KeysList([...this.internal_set]);
  }
}
export class StickPos {
  readonly angle: number;
  readonly magnitude: number;
  constructor(angle: number, magnitude: number) {
    this.angle = angle % 360;
    this.magnitude = FifteenBitInt(magnitude);
  }
  stringify(is_lstick: boolean): string {
    return `${
      is_lstick ? "LSTICK" : "RSTICK"
    }{${this.angle.toString()},${this.magnitude.toString()}`;
  }
  equals(other: StickPos): boolean {
    if (!other) return;
    return (
      (this.angle === other.angle && this.magnitude === other.magnitude) ||
      (this.empty() && other.empty())
    );
  }
  empty(): boolean {
    return this.magnitude === 0;
  }
  clone(): StickPos {
    return new StickPos(this.angle, this.magnitude);
  }
}
