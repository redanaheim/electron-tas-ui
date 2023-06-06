import {
  FifteenBitInt, Key, KeysList, key_to_string, last_index_of,
  ParsedLine, StickPos, string_to_key
} from "./classes";

const calc_angle = function (x: number, y: number): number {
  if (x === 0 && y === 0) {
    return 0;
  }
  const base = (Math.atan(x / y) * 180) / Math.PI;
  if (x >= 0 && y >= 0) return base;
  if (x >= 0 && y < 0) return 180 + base;
  if (x < 0 && y < 0) return 180 + base;
  if (x <= 0 && y > 0) return 360 + base;
  if (x < 0 && y === 0) return 270;
};

// autofold/fold_next
const cartesian_to_polar = (
  x: number,
  y: number,
  allow_decimals?: boolean
): StickPos => {
  return new StickPos(
    allow_decimals
      ? Math.round(calc_angle(x, y) * 100000000000) / 100000000000
      : Math.round(calc_angle(x, y)),
    FifteenBitInt(Math.sqrt(x ** 2 + y ** 2))
  );
};

// autofold/fold_next
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
  are_keys_same: boolean;
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
  constructor(
    line: string,
    used_to_clear?: boolean,
    throw_errors?: boolean,
    allow_decimals?: boolean
  ) {
    this.on_keys = new KeysList();
    this.off_keys = new KeysList();
    if (used_to_clear) this.used_to_clear = true;
    line = line.trim();
    if ((!PureInputLine.line_regex.test(line) || line === "") && throw_errors) {
      throw new Error(`Invalid line "${line}", cannot parse`);
    }
    // Frame number
    const parts = line.split(" ");
    this.frame = +parts[0];
    // Pressed keys
    if (parts[1] === "NONE") {
      this.pressed_keys = new KeysList();
    } else {
      this.pressed_keys = new KeysList();
      this.pressed_keys.append_list(
        parts[1].split(";").map(x => string_to_key(x))
      );
    }
    // Stick positions
    this.lstick_pos_cartesian = [
      +parts[2].split(";")[0],
      +parts[2].split(";")[1],
    ];
    this.lstick_pos = cartesian_to_polar(
      this.lstick_pos_cartesian[0],
      this.lstick_pos_cartesian[1],
      allow_decimals
    );
    this.rstick_pos_cartesian = [
      +parts[3].split(";")[0],
      +parts[3].split(";")[1],
    ];
    this.rstick_pos = cartesian_to_polar(
      this.rstick_pos_cartesian[0],
      this.rstick_pos_cartesian[1],
      allow_decimals
    );
  }
  compare_to(previous: PureInputLine): void {
    this.compared = true;
    this.clone_keys = new KeysList();
    this.on_keys = new KeysList();
    this.off_keys = new KeysList();
    this.previous = previous;
    for (const key of all_keys) {
      const this_has = this.pressed_keys
        .get_array()
        .includes(key_to_string(key));
      const prev_has = previous.pressed_keys
        .get_array()
        .includes(key_to_string(key));
      if (this_has === prev_has && this_has) {
        this.clone_keys.append(key);
      } else if (this_has === prev_has && !this_has) {
        continue;
      } else if (this_has) {
        this.on_keys.append(key);
      } else {
        this.off_keys.append(key);
      }
    }

    this.are_keys_same =
      this.on_keys.equals(this.previous.on_keys) &&
      this.off_keys.equals(this.previous.off_keys);
    this.lstick_changes = !this.lstick_pos.equals(previous.lstick_pos);
    this.rstick_changes = !this.rstick_pos.equals(previous.rstick_pos);
  }
  equals_last(): boolean {
    // Does this object have the exact same inputs as the one before it?
    return !this.lstick_changes && !this.rstick_changes && this.are_keys_same;
  }
  print(is_last?: boolean): string {
    let buffer = `${this.frame === 1 ? "+" : this.frame - this.previous.frame}`;
    // Should we add anything to the line regarding the keys?
    let added_keys = false;
    if (!this.are_keys_same) {
      const on_keys = this.on_keys.get_array();
      const off_keys = this.off_keys.get_array();
      if (this.pressed_keys.get_array().length === 0) {
        buffer += " OFF{ALL}";
        added_keys = true;
      } else if (this.clone_keys.get_array().length === 0) {
        buffer += ` RAW{${this.pressed_keys.get_array().join(",")}}`;
        added_keys = true;
      } else {
        if (on_keys.length > 0) {
          buffer += ` ON{${on_keys.join(",")}}`;
          added_keys = true;
        }
        if (off_keys.length > 0) {
          buffer += ` OFF{${off_keys.join(",")}}`;
          added_keys = true;
        }
      }
    }
    if (!added_keys && is_last) {
      buffer += " ON{NONE}";
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

export const script_from_parsed_lines = function (
  update_frames: ParsedLine[]
): string[] {
  const buffer: string[] = [];
  let current_frame = 0;
  let current_line = "";
  for (const update_frame of update_frames) {
    if (update_frame.frame === 1) {
      current_line += "+";
    } else {
      current_line += update_frame.frame - current_frame;
    }
    current_frame = update_frame.frame;
    if (update_frame.keys_on.length > 0 || update_frame.frame === 1) {
      current_line += ` ON{${update_frame.keys_on.join(",") || "NONE"}}`;
    }
    if (update_frame.keys_off.length > 0) {
      current_line += ` OFF{${update_frame.keys_off.join(",")}}`;
    }
    if (update_frame.lstick_changes) {
      current_line += ` LSTICK{${update_frame.lstick_pos_polar.join(",")}}`;
    }
    if (update_frame.rstick_changes) {
      current_line += ` RSTICK{${update_frame.rstick_pos_polar.join(",")}}`;
    }
    if (current_line.length > 0) {
      buffer.push(current_line);
    }
    current_line = "";
  }
  return buffer;
};

export const decompile = function (
  script: string[],
  throw_errors?: boolean,
  allow_decimals?: boolean
): string {
  let buffer = "";
  const lines = script.map(x => x.replace(/[\r\n]/g, ""));
  const queue = [PureInputLine.empty];
  let last_updated_frame = 0;
  for (const line of lines) {
    const obj = new PureInputLine(
      line,
      false,
      throw_errors || false,
      allow_decimals
    );
    let added_clear = false;
    // Compare the current line to the last item in the queue
    obj.compare_to(queue[last_index_of(queue)]);
    // This inserts a line right after the one before the one we are on right now to clear the inputs.
    if (obj.frame - last_updated_frame > 1) {
      added_clear = true;
      const new_empty_obj = new PureInputLine(
        `${last_updated_frame + 1} NONE 0;0 0;0`,
        true,
        allow_decimals
      );
      new_empty_obj.compare_to(obj.previous);
      if (!new_empty_obj.equals_last()) {
        queue.push(new_empty_obj);
      }
    }
    // If it's equal to the last one in the queue anyway, why bother?
    if (
      !obj.equals_last() ||
      added_clear ||
      line === lines[last_index_of(lines)]
    ) {
      queue.push(
        new PureInputLine(line, false, throw_errors || false, allow_decimals)
      );
    }
    last_updated_frame = obj.frame;
  }
  for (let i = 1; i < queue.length; i++) {
    const element = queue[i];
    element.compare_to(queue[i - 1]);
    buffer += `${element.print(i === last_index_of(queue))}\n`;
  }
  return buffer;
};
