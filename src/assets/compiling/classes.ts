export const Int = function (float: number): number {
  return Math[float >= 0 ? "floor" : "ceil"](float);
};
export const FifteenBitInt = function (float: number): number {
  return Math.abs(float) > 32767 ? Math.sign(float) * 32767 : Int(float);
};

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
  A = "KEY_A",
  B = "KEY_B",
  X = "KEY_X",
  Y = "KEY_Y",
  DLEFT = "KEY_DLEFT",
  DUP = "KEY_DUP",
  DDOWN = "KEY_DDOWN",
  DRIGHT = "KEY_DRIGHT",
  L = "KEY_L",
  R = "KEY_R",
  ZL = "KEY_ZL",
  ZR = "KEY_ZR",
  PLUS = "KEY_PLUS",
  MINUS = "KEY_MINUS",
  LSTICK = "KEY_LSTICK",
  RSTICK = "KEY_RSTICK",
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
      return undefined;
    }
  }
};

export const string_to_key = function (key: string): Key {
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
    default: {
      return undefined;
    }
  }
};

export class KeysList {
  private internal_array: Key[];
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
  constructor() {
    this.internal_array = [];
  }
  append(key: Key): void {
    if (this.internal_array.includes(key)) return;
    this.internal_array.push(key);
  }
  append_list(key_list: Key[]): void {
    for (const key of key_list) {
      this.append(key);
    }
  }
  remove(key: Key): void {
    const new_internal_array = [];
    for (const existing_key of this.internal_array) {
      if (key !== existing_key) {
        new_internal_array.push(existing_key);
      }
    }
    this.internal_array = new_internal_array;
  }
  remove_list(key_list: Key[]): void {
    const new_internal_array = [];
    for (const existing_key of this.internal_array) {
      if (key_list.includes(existing_key) === false) {
        new_internal_array.push(existing_key);
      }
    }
    this.internal_array = new_internal_array;
  }
  length(): number {
    return this.internal_array.length;
  }
  get_array(): string[] {
    return this.internal_array.map((x) => key_to_string(x));
  }
  equals(other: KeysList): boolean {
    for (const key of this.internal_array) {
      if (other.get_array().includes(key) === false) return false;
    }
    return other.get_array().length === this.internal_array.length;
  }
  has(key: Key): boolean {
    return this.internal_array.includes(key);
  }
}
export class StickPos {
  readonly angle: number;
  readonly magnitude: number;
  constructor(angle: number, magnitude: number) {
    this.angle = angle;
    this.magnitude = FifteenBitInt(magnitude);
  }
  stringify(is_lstick: boolean): string {
    return `${
      is_lstick ? "LSTICK" : "RSTICK"
    }{${this.angle.toString()},${this.magnitude.toString()}`;
  }
  equals(other: StickPos): boolean {
    return this.angle === other.angle && this.magnitude === other.magnitude;
  }
}
