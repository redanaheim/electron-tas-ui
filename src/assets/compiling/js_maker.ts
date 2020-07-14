import {
  ParsedLine,
  Key,
  KeysList,
  StickPos,
  Int,
  string_to_key,
  last_index_of,
} from "./classes";

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
      this.rest_info = options.blank_queue_element || void 0;
    } else {
      this.is_input_frame = true;
      this.inputs = options.input_frame || void 0;
    }
  }
  is_empty(): boolean {
    if (!this.is_input_frame) return false;
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
      !this.queue_reference.data[this.queue_reference.data.length - 2]
        .is_input_frame &&
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
    if (list instanceof Array) {
      list = list.map((x) => string_to_key(x));
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.on_keys.append_list(list);
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.off_keys.remove_list(list);
    } else if (typeof list === "string") {
      const single_key = string_to_key(String(list));
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.on_keys.append(single_key);
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.off_keys.remove(single_key);
    }
  }
  press_all(): void {
    this.press(KeysList.all_keys);
  }
  release(list: Key[]): void {
    if (list instanceof Array) {
      list = list.map((x) => string_to_key(x));
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.on_keys.remove_list(list);
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.off_keys.append_list(list);
    } else if (typeof list === "string") {
      const single_key = string_to_key(String(list));
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.on_keys.remove(single_key);
      this.queue_reference.data[
        last_index_of(this.queue_reference.data)
      ].inputs.off_keys.append(single_key);
    }
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
