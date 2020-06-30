import {
  KeysList,
  StickPos,
  Key,
  last_index_of,
  key_to_string,
  ParsedLine,
  FileLike,
} from "../assets/compiling/classes";

import { script_from_parsed_lines } from "../assets/compiling/decompile";

import { compile } from "../assets/compiling/compile";

interface PianoRollRowConstructorOptions {
  previous: PianoRollRow;
  active_keys: KeysList;
  lstick_pos: StickPos;
  rstick_pos: StickPos;
  reference: JQuery<HTMLElement>;
  frame?: number;
}

const add_animate_first_hover = function (): void {
  $(this).addClass("animate");
  $(this).off("mouseenter");
};

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
  // root PianoRoll element
  owner?: PianoRoll;
  // if this element is a clone row, this is a reference to the source
  row_owner?: PianoRollRow;
  is_row_owner?: boolean;
  // is the button for expanding clones clicked
  expand_clones = false;
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
  frozen = false; // should we stop evaluating keys?
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
    const row = $("<tr/>")
      .addClass("piano_roll_row")
      .append($("<td/>").addClass("spacer"))
      .append(
        $("<td/>")
          .addClass("frame_number_container")
          .append(
            $("<span/>")
              .addClass("frame_number")
              .text(String(this.current_frame))
              .data("owner_row", this)
              .hover(
                function () {
                  const row: PianoRollRow = $(this).data("owner_row");
                  if (row.is_row_owner) {
                    $(this)
                      .stop(false, true)
                      .removeClass("bg_fade_out")
                      .addClass("bg_fade_in");
                  }
                },
                function () {
                  const row: PianoRollRow = $(this).data("owner_row");
                  if (row.is_row_owner) {
                    $(this)
                      .stop(false, true)
                      .removeClass("bg_fade_in")
                      .addClass("bg_fade_out");
                  }
                }
              )
              .click(function () {
                const row: PianoRollRow = $(this).data("owner_row");
                row.toggle_expand();
              })
          )
      )
      .append($("<td/>").addClass("spacer"));
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
    // Add and remove row buttons
    row
      .append(
        $("<td/>")
          .append(
            $("<button/>")
              .addClass("add_button")
              .click(function () {
                const row = $(this).parents("tr").data("object");
                row.owner.add(null, row.owner.get_position(row) + 1);
              })
              .append(
                $("<img/>")
                  .attr("src", "../assets/ui_buttons/row.svg")
                  .addClass("add_btn_img row_btn bg_appear_hover")
                  .hover(add_animate_first_hover)
              )
          )
          .addClass("row_btn_container")
      )
      .append(
        $("<td/>")
          .append(
            $("<button/>")
              .addClass("remove_button")
              .click(function () {
                const row = $(this).parents("tr").data("object");
                row.owner.remove(row.owner.get_position(row));
              })
              .append(
                $("<img/>")
                  .attr("src", "../assets/ui_buttons/remove_row.svg")
                  .addClass("remove_btn_img row_btn bg_appear_hover")
                  .hover(add_animate_first_hover)
              )
          )
          .addClass("row_btn_container")
      );
    row.data("object", this);
    row.hover(
      function () {
        $(".row_btn_container").stop(false, true);
        $(this).children(".row_btn_container").fadeTo(400, 1);
      },
      function () {
        $(this).children(".row_btn_container").fadeTo(400, 0);
      }
    );
    return row;
  }
  get_next(): PianoRollRow {
    return this.owner.get(this.owner.get_position(this) + 1);
  }
  freeze(): void {
    this.frozen = true;
  }
  unfreeze(): void {
    this.frozen = false;
  }
  toggle_expand(): void {
    if (this.expand_clones && this.owner && !this.owner.show_clones) {
      // if we're not currently showing clones as a whole
      // AND we are showing them currently on this element
      this.show_children(false);
      this.expand_clones = !this.expand_clones;
    } else if (this.owner && this.owner.show_clones) {
      // if we are currently showing clones as a whole
      this.show_children();
    } else if (!this.expand_clones && this.owner && !this.owner.show_clones) {
      // if we are currently not showing clones as a whole and we are also not showing them here
      this.show_children();
      this.expand_clones = !this.expand_clones;
    }
  }
  toggle_key(key: Key): void {
    if (this.active_keys.has(key)) {
      this.on_keys.remove(key);
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
  set_bg(color?: string): void {
    if (!this.reference) return;
    this.reference.css("background-color", color);
  }
  reeval_keys(previous?: PianoRollRow, set_previous?: boolean): void {
    if (this.frozen) return;
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
        this.off_keys.remove(key);
        this.show_key(key, true);
      } else {
        this.show_key(key, false);
        this.active_keys.remove(key);
        this.off_keys.remove(key);
      }
    }
    return;
  }
  reeval_sticks(previous: PianoRollRow, set_previous?: boolean): void {
    if (this.frozen) return;
    if (!previous) previous = this.previous || null;
    if (set_previous) {
      this.previous = previous;
    }
    this.is_lstick_clone = this.lstick_pos.equals(previous.lstick_pos);
    this.is_rstick_clone = this.lstick_pos.equals(previous.rstick_pos);
  }
  reeval(previous: PianoRollRow, hide_clones?: boolean): void {
    if (!previous) previous = this.previous || null;
    this.previous = previous;
    this.reeval_keys(previous, false);
    this.reeval_sticks(previous, false);
    // Update whether this row is a clone
    if (this.on_keys.length() === 0 && this.off_keys.length() === 0) {
      this.is_clone = this.is_lstick_clone && this.is_rstick_clone;
      if (this.is_clone) {
        let potential_owner = this.previous;
        while (potential_owner.is_clone) {
          if (potential_owner.previous.has_previous) {
            potential_owner = potential_owner.previous;
          } else {
            break;
          }
        }
        this.row_owner = potential_owner;
        potential_owner.is_row_owner = true;
      }
    } else {
      this.is_clone = false;
    }
    if (
      hide_clones &&
      this.is_clone &&
      this.row_owner &&
      !this.row_owner.expand_clones
    ) {
      this.show(false);
    } else if (
      (hide_clones && !this.is_clone) ||
      (this.row_owner && this.row_owner.expand_clones) ||
      !hide_clones
    ) {
      this.show();
    }
    // Update frame number in case elements have been removed.
    this.current_frame = this.previous.current_frame + 1;
    this.reference.find(".frame_number").text(this.current_frame);
  }
  show(should_show = true): void {
    if (should_show) {
      this.reference.fadeIn(400);
    } else {
      this.reference.fadeOut(400);
    }
  }
  get_row_children(): PianoRollRow[] {
    const children: PianoRollRow[] = [];
    if (!this.is_row_owner) {
      return children;
    } else {
      for (
        let next = this.get_next();
        next && next.is_clone;
        next = next.get_next()
      ) {
        children.push(next);
      }
    }
    return children;
  }
  show_children(should_show = true): void {
    if (this.is_row_owner) {
      this.get_row_children().forEach((child: PianoRollRow): void => {
        child.show(should_show);
      });
    }
  }
}

interface PianoRollKeyState {
  [key: string]: boolean;
}

export class PianoRoll {
  readonly contents: PianoRollRow[];
  readonly reference: JQuery<HTMLElement>;
  readonly key_state: PianoRollKeyState = {}; // for keeping track of pressed keys
  navbar?: JQuery<HTMLElement>;
  show_clones = true;
  static click_handler_func = function (): void {
    $(this).parent().data("object").toggle_key($(this).data("value")); // get the clicked element's parent,
    // get the PianoRollRow object corresponding to that, then toggle the corresponding key
  };
  constructor(options: {
    contents: PianoRollRow[];
    reference: JQuery<HTMLElement>;
    jquery_document?: JQuery<Document>;
    navbar?: JQuery<HTMLElement>;
  }) {
    this.contents = options.contents;
    this.reference = options.reference;
    this.reference.data("object", this);
    // Create keys listener to see when shift is pressed (for key toggles)
    if (options.jquery_document) {
      // copy this.key_state because the this context changes in the handler function
      const state = this.key_state;
      // listen for keyup and keydown, then set whether shift is pressed or not
      options.jquery_document.keydown(function (e) {
        state.shift = e.shiftKey;
      });
      options.jquery_document.keyup(function (e) {
        state.shift = e.shiftKey;
      });
    }
    if (options.navbar) {
      this.navbar = options.navbar;
      this.bind_navbar(this.navbar);
    }
    $(".key").click(PianoRoll.click_handler_func);
  }
  toggle_clones(): void {
    this.show_clones = !this.show_clones;
    this.refresh();
  }
  bind_navbar(navbar: JQuery<HTMLElement>): void {
    this.navbar = navbar || this.navbar;
    this.create_navbar();
    this.navbar.data("owner", this); // table element
    this.navbar.append(
      $("<tr/>")
        .append(
          $("<td/>")
            .append(
              $("<button/>")
                .addClass("toggle_clones navbar_element")
                .click(function () {
                  const owner_piano: PianoRoll = $(this).data("owner");
                  owner_piano.toggle_clones();
                })
                .data("owner", this)
                .text("Toggle Identical Lines")
            )
            .addClass("navbar_button")
        )
        .append(
          $("<td/>")
            .append(
              $("<button/>")
                .addClass("export_better_scripts navbar_element")
                .click(function () {
                  const owner_piano: PianoRoll = $(this).data("owner");
                  console.log(owner_piano.make_better_scripts(true));
                })
                .data("owner", this)
                .text("Export as Better Scripts Script")
            )
            .addClass("navbar_button")
        )
        .append(
          $("<td/>")
            .append(
              $("<button/>")
                .addClass("export_better_scripts navbar_element")
                .click(function () {
                  const owner_piano: PianoRoll = $(this).data("owner");
                  console.log(owner_piano.make_nx_tas(false));
                })
                .data("owner", this)
                .text("Export as nx-TAS Script")
            )
            .addClass("navbar_button")
        )
    );
  }
  create_navbar(): void {
    this.navbar.html("");
  }
  get(position: number): PianoRollRow {
    if (!this.contents[position]) {
      return null;
    }
    return this.contents[position];
  }
  get_position(row: PianoRollRow): number {
    return this.contents.indexOf(row);
  }
  add(element: JQuery<HTMLElement> | null, position?: number): void {
    position = position !== undefined ? position : last_index_of(this.contents);
    const previous_in_position = this.get(position) || new PianoRollRow();
    const input_line = new PianoRollRow({
      previous: previous_in_position,
      active_keys: previous_in_position.active_keys.clone() || new KeysList(),
      lstick_pos: previous_in_position.lstick_pos.clone() || new StickPos(0, 0),
      rstick_pos: previous_in_position.rstick_pos.clone() || new StickPos(0, 0),
      reference: element,
      frame:
        this.contents.length > 0 ? previous_in_position.current_frame + 1 : 1,
    });
    input_line.owner = this;
    if (!element) {
      element = input_line.create_element();
      input_line.reference = element;
      if (this.contents.length === 0) {
        this.reference.append(element);
      } else {
        this.get(position > 0 ? position - 1 : 0).reference.after(element);
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
    this.get(position).reference.remove();
    this.contents.splice(position, 1);
    this.refresh();
  }
  refresh(): void {
    // EXTREMELY INTENSIVE
    this.get(0).reeval(new PianoRollRow());
    for (let i = 1; i < this.contents.length; i++) {
      this.get(i).reeval(this.get(i - 1), !this.show_clones);
    }
    // re-bind click events for new elements
    $(".key").off("click");
    $(".key").click(PianoRoll.click_handler_func);
  }
  make_update_frames(): ParsedLine[] {
    const to_return: ParsedLine[] = [];
    for (const line of this.contents) {
      if (!line.is_clone) {
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
    }
    return to_return;
  }
  make_better_scripts(array?: boolean): FileLike {
    if (array) {
      return new FileLike(script_from_parsed_lines(this.make_update_frames()));
    } else {
      return new FileLike(
        script_from_parsed_lines(this.make_update_frames()).join("\n")
      );
    }
  }
  make_nx_tas(throw_errors?: boolean): FileLike {
    return new FileLike(
      compile("", throw_errors, true, this.make_update_frames())
    );
  }
}
