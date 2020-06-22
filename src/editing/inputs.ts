import {
  KeysList,
  StickPos,
  Key,
  last_index_of,
  ParsedLine,
  key_to_string,
} from "../assets/compiling/classes";

interface PianoRollRowConstructorOptions {
  previous: PianoRollRow;
  active_keys: KeysList;
  lstick_pos: StickPos;
  rstick_pos: StickPos;
  reference: JQuery<HTMLElement>;
  frame?: number;
}

const create_key_element = function (key: Key): JQuery<HTMLElement> {
  return $("<td/>")
    .addClass("key")
    .append(
      $("<img/>")
        .addClass("key_icon")
        .attr(
          "src",
          `../assets/buttons/svg/${key_to_string(key)
            .toLowerCase()
            .substring(4)}.svg`
        )
    )
    .data("value", key);
};

const create_stick_element = function (is_left: boolean): JQuery<HTMLElement> {
  return $("<td/>")
    .addClass("key")
    .append(
      $("<img/>")
        .addClass("key_icon")
        .addClass("stick_icon")
        .attr("src", `../assets/buttons/svg/${is_left ? "l" : "r"}stick.svg`)
    )
    .data("is_left", is_left)
    .data("value", is_left ? Key.LSTICK : Key.RSTICK);
};

interface KeyToReferenceStore {
  [key: string]: JQuery<HTMLElement>;
}

export class PianoRollRow {
  static all_keys = [
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
  // is this the first line?
  has_previous: boolean;
  owner?: PianoRoll;
  previous?: PianoRollRow | null;
  reference: JQuery<HTMLElement> | null;
  current_frame: number;
  active_keys: KeysList; // all keys pressed on this frame
  on_keys: KeysList; // keys newly pressed on this frame
  off_keys: KeysList; // keys released on this frame
  cloned_on_keys: KeysList; // keys that are on and inherited from the frame before
  lstick_pos: StickPos;
  rstick_pos: StickPos;
  // is the stick position inherited from previous frame?
  is_lstick_clone: boolean;
  is_rstick_clone: boolean;
  is_clone: boolean; // is everthing about the frame the same as the previous?
  key_references: KeyToReferenceStore = {};
  constructor(options?: PianoRollRowConstructorOptions) {
    if (!options) {
      // Create empty object for the purpose of serving as previous for a later line
      this.current_frame = 0;
      this.active_keys = new KeysList();
      this.has_previous = false;
      this.is_clone = false;
      this.is_lstick_clone = false;
      this.is_rstick_clone = false;
      this.lstick_pos = new StickPos(0, 0);
      this.rstick_pos = new StickPos(0, 0);
      this.on_keys = new KeysList();
      this.off_keys = new KeysList();
    } else {
      // destructuring options for less unreadable code
      const {
        previous,
        active_keys,
        lstick_pos,
        rstick_pos,
        frame,
        reference,
      } = options;
      this.has_previous = Boolean(previous);
      this.reference = reference;
      this.current_frame = frame || previous.current_frame + 1;
      this.active_keys = active_keys;
      this.on_keys = new KeysList();
      this.off_keys = new KeysList();
      // re-call constructor to fix range issues, i.e. magnitude over 32767
      this.lstick_pos = new StickPos(lstick_pos.angle, lstick_pos.magnitude);
      this.rstick_pos = new StickPos(rstick_pos.angle, rstick_pos.magnitude);
      // clone calculation
      this.cloned_on_keys = new KeysList();
      // iterating over every key pressed in the previous frame, if it is pressed here too, it's a clone key
      for (const key of PianoRollRow.all_keys) {
        const this_has = this.active_keys.has(key);
        const prev_has = previous.active_keys.has(key);
        if (this_has === prev_has) {
          this.cloned_on_keys.append(key);
        } else if (this_has) {
          this.on_keys.append(key);
        } else {
          this.off_keys.append(key);
        }
      }
      // check the same way for sticks
      this.is_lstick_clone = this.lstick_pos.equals(previous.lstick_pos);
      this.is_rstick_clone = this.lstick_pos.equals(previous.rstick_pos);
      // if both sticks are cloned, and this.clone_keys has the same length as this.active_keys, this object is a clone
      this.is_clone =
        this.is_lstick_clone &&
        this.is_rstick_clone &&
        this.cloned_on_keys.length() === Object.keys(Key).length;
    }
  }
  create_element(): JQuery<HTMLElement> {
    const row = $("<tr/>").append(
      $("<td/>").addClass("frame_number").text(String(this.current_frame))
    );
    for (const key of PianoRollRow.all_keys) {
      if (key === Key.LSTICK || key === Key.RSTICK) {
        continue;
      }
      const key_el = create_key_element(key);
      row.append(key_el);
      this.key_references[key_to_string(key)] = key_el;
    }
    const lstick = create_stick_element(true);
    const rstick = create_stick_element(false);
    this.key_references["KEY_LSTICK"] = lstick;
    this.key_references["KEY_RSTICK"] = rstick;
    row.append(lstick).append(rstick);
    row.data("object", this);
    return row;
  }
  toggle_key(key: Key): void {
    if (this.active_keys.has(key)) {
      this.off_keys.append(key);
    } else {
      this.on_keys.append(key);
      this.off_keys.remove(key);
      this.active_keys.append(key);
    }
    if (this.reference) {
      this.key_references[key_to_string(key)].toggleClass("active");
    }
    if (this.owner) {
      this.owner.refresh();
    } else {
      this.reeval_keys(this.previous, false);
    }
  }
  show_key(key: Key, pressed?: boolean): void {
    if (this.reference) {
      const key_reference = this.key_references[key_to_string(key)];
      if (key_reference.hasClass("active") && !pressed) {
        key_reference.removeClass("active");
      } else if (pressed && !key_reference.hasClass("active")) {
        key_reference.addClass("active");
      }
    }
  }
  set_stick(is_lstick: boolean, pos: StickPos): void {
    this[is_lstick ? "lstick_pos" : "rstick_pos"] = pos;
  }
  reeval_keys(previous?: PianoRollRow, set_previous?: boolean): KeysList {
    // for updating the object when some previous line changes
    this.cloned_on_keys = new KeysList();
    if (!previous) previous = this.previous || null;
    if (set_previous) {
      // update this object's previous row
      this.previous = previous;
    }
    // check which keys are inherited
    for (const key of PianoRollRow.all_keys) {
      if (this.previous.active_keys.has(key) && !this.off_keys.has(key)) {
        this.cloned_on_keys.append(key);
        this.active_keys.append(key);
        this.on_keys.remove(key);
        this.show_key(key, true);
      } else if (this.previous.active_keys.has(key)) {
        this.cloned_on_keys.remove(key);
        this.active_keys.remove(key);
        this.on_keys.remove(key);
        this.show_key(key, false);
      } else if (this.on_keys.has(key)) {
        this.active_keys.append(key);
        this.show_key(key, true);
      } else if (!this.on_keys.has(key)) {
        this.show_key(key, false);
        this.active_keys.remove(key);
      }
    }
    return this.cloned_on_keys;
  }
  reeval_sticks(previous: PianoRollRow, set_previous?: boolean): void {
    if (!previous) previous = this.previous || null;
    if (set_previous) {
      this.previous = previous;
    }
    this.is_lstick_clone = this.lstick_pos.equals(previous.lstick_pos);
    this.is_rstick_clone = this.lstick_pos.equals(previous.rstick_pos);
  }
  reeval(previous: PianoRollRow): void {
    if (!previous) previous = this.previous || null;
    this.previous = previous;
    this.reeval_keys(previous, false);
    this.reeval_sticks(previous, false);
  }
}

export class PianoRoll {
  readonly contents: PianoRollRow[];
  readonly reference: JQuery<HTMLElement>;
  constructor(contents: PianoRollRow[], reference: JQuery<HTMLElement>) {
    this.contents = contents;
    this.reference = reference;
    this.reference.data("object", this);
  }
  add(element: JQuery<HTMLElement> | null, position?: number): void {
    const input_line = new PianoRollRow({
      previous:
        this.contents[last_index_of(this.contents)] || new PianoRollRow(),
      active_keys: new KeysList(),
      lstick_pos: new StickPos(0, 0),
      rstick_pos: new StickPos(0, 0),
      reference: element,
      frame:
        this.contents.length > 0
          ? this.contents[last_index_of(this.contents)].current_frame + 1
          : 1,
    });
    input_line.owner = this;
    if (!element) {
      element = input_line.create_element();
      input_line.reference = element;
      if (this.contents.length === 0) {
        this.reference.append(element);
      } else {
        this.contents[position || last_index_of(this.contents)].reference.after(
          element
        );
      }
    }
    if (!position) {
      this.contents.push(input_line);
    } else {
      this.contents.splice(position, 0, input_line);
    }
    this.refresh();
  }
  remove(position: number): void {
    this.contents[position].reference.remove();
    this.contents.splice(position, 1);
    this.refresh();
  }
  refresh(): void {
    // EXTREMELY INTENSIVE
    // TODO: web worker?
    this.contents[0].reeval(new PianoRollRow());
    for (let i = 1; i < this.contents.length; i++) {
      this.contents[i].reeval(this.contents[i - 1]);
    }
  }
  initiate_events(): void {
    $(".key").click(function () {
      $(this).parent().data("object").toggle_key($(this).data("value")); // get the clicked element's parent,
      // get the PianoRollRow object corresponding to that, then toggle the corresponding key
    });
  }
  make_update_frames(): ParsedLine[] {
    const to_return: ParsedLine[] = [];
    for (const line of this.contents) {
      to_return.push({
        frame: line.current_frame,
        keys_on: line.on_keys.get_array(),
        keys_off: line.off_keys.get_array(),
        lstick_pos_polar: [line.lstick_pos.angle, line.lstick_pos.magnitude],
        rstick_pos_polar: [line.rstick_pos.angle, line.rstick_pos.magnitude],
        lstick_changes: !line.is_lstick_clone,
        rstick_changes: !line.is_rstick_clone,
      });
    }
    return to_return;
  }
  log(): void {
    console.log(this);
  }
}
