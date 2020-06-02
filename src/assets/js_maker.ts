import { ParsedLine } from "./compile";
const last_index_of = function (array: any[]): number {
  return array.length - 1;
};
const Int = function (float: number): number {
  return Math[float >= 0 ? "floor" : "ceil"](float);
};
const FifteenBitInt = function (float: number): number {
  return Math.abs(float) > 32767 ? Math.sign(float) * 32767 : Int(float);
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
const key_to_string = function (key: Key): string {
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
const string_to_key = function (key: string): Key {
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
  get_array(): string[] {
    return this.internal_array.map((x) => key_to_string(x));
  }
}
class StickPos {
  readonly angle: number;
  readonly magnitude: number;
  constructor(angle: number, magnitude: number) {
    this.angle = Int(angle);
    this.magnitude = FifteenBitInt(magnitude);
  }
}
class VirtualControllerFrame {
  frame: number;
  on_keys: KeysList;
  off_keys: KeysList;
  lstick_pos: StickPos;
  rstick_pos: StickPos;
  lstick_changes: boolean;
  rstick_changes: boolean;
  constructor(frame: number) {
    this.on_keys = new KeysList();
    this.off_keys = new KeysList();
    this.lstick_pos = new StickPos(0, 0);
    this.rstick_pos = new StickPos(0, 0);
    this.lstick_changes = false;
    this.rstick_changes = false;
    this.frame = frame;
  }
  static empty_virtual_controller_frame = ((): VirtualControllerFrame => {
    return new VirtualControllerFrame(1);
  })();
  make_parsed_line(): ParsedLine {
    return {
      frame: this.frame,
      keys_on: this.on_keys.get_array(),
      keys_off: this.off_keys.get_array(),
      lstick_changes: this.lstick_changes,
      rstick_changes: this.rstick_changes,
      lstick_pos_polar: [this.lstick_pos.angle, this.lstick_pos.magnitude],
      rstick_pos_polar: [this.rstick_pos.angle, this.rstick_pos.magnitude],
    };
  }
}
class BlankQueueElement {
  private rest_frames: number;
  constructor(rest_frames: number) {
    this.rest_frames = Int(rest_frames);
  }
  rest_more(rest_frames: number): void {
    this.rest_frames += rest_frames;
  }
  rest_less(awake_frames: number): void {
    this.rest_frames -= awake_frames;
  }
}
interface InternalQueueElementOptions {
  use_blank_queue_element: boolean;
  blank_queue_element?: BlankQueueElement;
  input_frame?: VirtualControllerFrame;
}
class InternalQueueElement {
  is_input_frame: boolean;
  inputs: VirtualControllerFrame;
  rest_info: BlankQueueElement;
  constructor(options: InternalQueueElementOptions) {
    if (options.use_blank_queue_element) {
      this.is_input_frame = false;
      this.rest_info = options.blank_queue_element || undefined;
    } else {
      this.is_input_frame = true;
      this.inputs = options.input_frame || undefined;
    }
  }
  is_empty(): boolean {
    if (this.is_input_frame === false) return false;
    return (
      this.inputs.lstick_pos.magnitude === 0 &&
      this.inputs.rstick_pos.magnitude === 0 &&
      this.inputs.on_keys.get_array().length === 0 &&
      this.inputs.off_keys.get_array().length === 0
    );
  }
}
export class InternalQueue {
  data: InternalQueueElement[];
  constructor() {
    this.data = [];
  }
}
export class VirtualController {
  private current_frame = 1;
  queue_reference: InternalQueue;
  constructor(queue_reference: InternalQueue) {
    this.queue_reference = queue_reference;
    if (this.queue_reference.data.length === 0) {
      this.queue_reference.data.push(
        new InternalQueueElement({
          input_frame: VirtualControllerFrame.empty_virtual_controller_frame,
          use_blank_queue_element: false,
        })
      );
    }
  }
  frames(to_wait: number): void {
    // If the previous entry is an empty controller input and the entry before that is a wait
    if (
      this.queue_reference.data.length >= 2 &&
      this.queue_reference.data[this.queue_reference.data.length - 2]
        .is_input_frame === false &&
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].is_empty()
    ) {
      this.queue_reference.data[
        this.queue_reference.data.length - 2
      ].rest_info.rest_more(to_wait);
      this.current_frame += to_wait;
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.frame = this.current_frame;
    } else {
      this.queue_reference.data.push(
        new InternalQueueElement({
          blank_queue_element: new BlankQueueElement(to_wait),
          use_blank_queue_element: true,
        })
      );
      this.current_frame += to_wait;
      const new_controller_frame = new VirtualControllerFrame(
        this.current_frame
      );
      this.queue_reference.data.push(
        new InternalQueueElement({
          input_frame: new_controller_frame,
          use_blank_queue_element: false,
        })
      );
    }
  }
  press(list: Key[]): void {
    list = list.map((x) => string_to_key(x));
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.on_keys.append_list(list);
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.off_keys.remove_list(list);
  }
  press_all(): void {
    this.press(KeysList.all_keys);
  }
  release(list: Key[]): void {
    list = list.map((x) => string_to_key(x));
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.on_keys.remove_list(list);
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.off_keys.append_list(list);
  }
  release_all(): void {
    this.release(KeysList.all_keys);
  }
  set_lstick(angle: number, magnitude: number): void {
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.lstick_pos = new StickPos(angle, magnitude);
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.lstick_changes = true;
  }
  set_rstick(angle: number, magnitude: number): void {
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.rstick_pos = new StickPos(angle, magnitude);
    this.queue_reference.data[
      last_index_of(this.queue_reference.data)
    ].inputs.rstick_changes = true;
  }
  create_update_frames(): ParsedLine[] {
    const update_frames = [];
    for (const item of this.queue_reference.data) {
      if (item.is_input_frame) {
        update_frames.push(item.inputs.make_parsed_line());
      }
    }
    return update_frames;
  }
}
export const create_tas_from_script = function (
  tas_generator: (arg0: VirtualController) => VirtualController
): ParsedLine[] {
  const queue = new InternalQueue();
  const controller = new VirtualController(queue);
  return tas_generator(controller).create_update_frames();
};
