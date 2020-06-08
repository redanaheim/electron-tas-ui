import {
  KeysList,
  StickPos,
  Key,
  FifteenBitInt,
  Int,
  string_to_key,
  last_index_of,
} from "./js_maker";

const calc_angle = function (x: number, y: number): number {
  if (x === 0 && y === 0) {
    return 0;
  }
  const base = (Math.atan(x / y) * 180) / Math.PI;
  if (x >= 0 && y >= 0) return base;
  if (x >= 0 && y < 0) return 180 + base;
  if (x < 0 && y < 0) return 270 - base;
  if (x <= 0 && y > 0) return 360 + base;
  if (x < 0 && y === 0) return 270;
};

const cartesian_to_polar = (x: number, y: number): StickPos => {
  return new StickPos(
    Int(calc_angle(x, y)),
    FifteenBitInt(Math.sqrt(x ** 2 + y ** 2))
  );
};

const all_keys = [
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

class PureInputLine {
  frame: number;
  pressed_keys: KeysList;
  on_keys: KeysList;
  off_keys: KeysList;
  clone_keys: KeysList;
  lstick_pos_cartesian: [number, number];
  lstick_pos: StickPos;
  lstick_changes: boolean;
  rstick_pos_cartesian: [number, number];
  rstick_pos: StickPos;
  rstick_changes: boolean;
  previous: PureInputLine;
  compared = false;
  used_to_clear = false;
  static line_regex = /^[0-9]+ (?:(?:(?:KEY_[A-Z]+)|NONE);?)+ [0-9-]+;[0-9-]+ [0-9-]+;[0-9-]+$/i;
  static empty = ((): PureInputLine => {
    return new PureInputLine("0 NONE 0;0 0;0");
  })();
  constructor(line: string, used_to_clear?: boolean, throw_errors?: boolean) {
    if (used_to_clear) this.used_to_clear = true;
    line = line.trim();
    if (
      (PureInputLine.line_regex.test(line) === false || line === "") &&
      throw_errors
    ) {
      throw new Error(`Invalid line "${line}", cannot parse`);
    }
    // Frame number
    const parts = line.split(" ");
    this.frame = Number(parts[0]);
    // Pressed keys
    if (parts[1] === "NONE") {
      this.pressed_keys = new KeysList();
    } else {
      this.pressed_keys = new KeysList();
      this.pressed_keys.append_list(
        parts[1].split(";").map((x) => string_to_key(x))
      );
    }
    // Stick positions
    this.lstick_pos_cartesian = [
      Number(parts[2].split(";")[0]),
      Number(parts[2].split(";")[1]),
    ];
    this.lstick_pos = cartesian_to_polar(
      this.lstick_pos_cartesian[0],
      this.lstick_pos_cartesian[1]
    );
    this.rstick_pos_cartesian = [
      Number(parts[3].split(";")[0]),
      Number(parts[3].split(";")[1]),
    ];
    this.rstick_pos = cartesian_to_polar(
      this.rstick_pos_cartesian[0],
      this.rstick_pos_cartesian[1]
    );
  }
  compare_to(previous: PureInputLine): void {
    this.compared = true;
    this.clone_keys = new KeysList();
    this.on_keys = new KeysList();
    this.off_keys = new KeysList();
    this.previous = previous;
    for (const key of all_keys) {
      const this_has = this.pressed_keys.get_array().includes(key);
      const prev_has = previous.pressed_keys.get_array().includes(key);
      if (this_has === prev_has) {
        this.clone_keys.append(key);
      } else if (this_has) {
        this.on_keys.append(key);
      } else {
        this.off_keys.append(key);
      }
    }
    this.lstick_changes = this.lstick_pos.equals(previous.lstick_pos) === false;
    this.rstick_changes = this.rstick_pos.equals(previous.rstick_pos) === false;
  }
  equals_last(): boolean {
    const should_print_keys =
      this.clone_keys.equals(this.pressed_keys) === false;
    return (
      this.lstick_changes === false &&
      this.rstick_changes === false &&
      should_print_keys === false
    );
  }
  print(): string {
    let buffer = `${this.frame === 1 ? "+" : this.frame - this.previous.frame}`;
    const should_print_keys =
      this.clone_keys.equals(this.pressed_keys) === false;
    if (should_print_keys) {
      if (this.pressed_keys.get_array().length === 0) {
        buffer += " OFF{ALL}";
      } else {
        if (this.clone_keys.get_array().length === 0) {
          buffer += ` RAW{${this.pressed_keys.get_array().join(",")}}`;
        } else {
          buffer += ` ON{${this.on_keys.get_array().join(",")}}`;
          if (this.off_keys.get_array().length > 0) {
            buffer += ` OFF{${this.off_keys.get_array().join(",")}}`;
          }
        }
      }
    }
    if (this.lstick_changes) {
      buffer += ` ${this.lstick_pos.stringify(true)}}`;
    }
    if (this.rstick_changes) {
      buffer += ` ${this.rstick_pos.stringify(false)}}`;
    }
    return buffer;
  }
}

export const decompile = function (
  script: string | Buffer,
  throw_errors?: boolean
): string {
  let buffer = "";
  script = typeof script === "string" ? script : "";
  const lines = script.split("\n").map((x) => x.replace(/[\r\n]/g, ""));
  const queue = [PureInputLine.empty];
  for (const line of lines) {
    const obj = new PureInputLine(line);
    obj.compare_to(queue[last_index_of(queue)]);
    if (obj.frame - obj.previous.frame > 1) {
      const new_empty_obj = new PureInputLine(
        `${obj.previous.frame + 1} NONE 0;0 0;0`,
        true
      );
      new_empty_obj.compare_to(queue[last_index_of(queue)]);
      queue.push(new_empty_obj);
    }
    if (obj.equals_last() === false) {
      queue.push(new PureInputLine(line, false, throw_errors || false));
    }
  }
  for (let i = 1; i < queue.length; i++) {
    const element = queue[i];
    element.compare_to(queue[i - 1]);
    buffer += `${element.print()}\n`;
  }
  return buffer;
};
