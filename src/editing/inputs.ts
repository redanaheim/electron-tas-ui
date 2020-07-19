import {
  KeysList,
  StickPos,
  Key,
  last_index_of,
  key_to_string,
  ParsedLine,
  FileLike,
  string_to_key,
} from "../assets/compiling/classes";
import {
  script_from_parsed_lines,
  decompile,
} from "../assets/compiling/decompile";
import { compile, parse_line } from "../assets/compiling/compile";
import { Preprocessor } from "../assets/compiling/preprocess";
import { IpAddress } from "../ftp";
import { export_file, read_FileLike, write_file_async } from "../storing";
import { request_prompt } from "../assets/prompts/prompt_renderer";
import { ipcRenderer, remote } from "electron";
import { join } from "path";
import { rand_string } from "../utils";

interface PianoRollRowConstructorOptions {
  previous?: PianoRollRow;
  active_keys?: KeysList;
  lstick_pos?: StickPos;
  rstick_pos?: StickPos;
  reference?: JQuery<HTMLElement>;
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
    .addClass(`key ${is_left ? "lstick_el" : "rstick_el"}`)
    .append(
      $("<img/>")
        .addClass("key_icon stick_icon")
        .attr("src", `../assets/buttons/svg/${is_left ? "l" : "r"}stick.svg`)
    )
    .data("is_left", is_left)
    .data("value", is_left ? Key.LSTICK : Key.RSTICK);
};

const create_joystick_element = function (
  is_left: boolean,
  row_owner: PianoRollRow
): JQuery<HTMLElement> {
  return $("<td/>")
    .addClass("joystick")
    .append(
      $("<img/>")
        .addClass("joystick_icon")
        .attr("src", `../assets/sticks/svg/${is_left ? "l" : "r"}stick.svg`)
        .hover(
          function () {
            $(this)
              .stop(false, true) // stop animations already playing
              .removeClass("bg_fade_out")
              .addClass("bg_fade_in animate");
          },
          function () {
            $(this)
              .stop(false, true)
              .removeClass("bg_fade_in")
              .addClass("bg_fade_out");
          }
        )
    )
    .data("is_left", is_left)
    .data("value", is_left ? "left" : "right")
    .data("row_owner", row_owner)
    .click(function () {
      const row: PianoRollRow = $(this).data("row_owner");
      if (!row.owner) {
        row.reeval(row.previous);
      } else {
        row.owner.refresh();
      }
      if (!row.owner.stick_change_dialogue) return;
      row.owner.stick_change_dialogue.point_to(row, is_left);
    });
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
  has_previous = false;
  // root PianoRoll element
  owner?: PianoRoll;
  // if this element is a clone row, this is a reference to the source
  row_owner?: PianoRollRow;
  is_row_owner?: boolean;
  // is the button for expanding clones clicked
  expand_clones = false;
  previous?: PianoRollRow | null;
  reference: JQuery<HTMLElement> | null;
  associated_spacer?: JQuery<HTMLElement>;
  current_frame = 0;
  active_keys = new KeysList(); // all keys pressed on this frame
  on_keys = new KeysList(); // keys newly pressed on this frame
  off_keys = new KeysList(); // keys released on this frame
  cloned_on_keys = new KeysList(); // keys that are on and inherited from the frame before
  // are all keys cloned?
  all_keys_cloned = false;
  lstick_pos = new StickPos(0, 0);
  rstick_pos = new StickPos(0, 0);
  // is the stick position inherited from previous frame?
  is_lstick_clone = true;
  is_rstick_clone = true;
  is_clone = false; // is everthing about the frame the same as the previous?
  frozen = false; // should we stop evaluating keys?
  key_references: KeyToReferenceStore = {};
  static apply(row: PianoRollRow, line: ParsedLine): void {
    row.set_key(
      line.keys_on.map(x => string_to_key(x)),
      true
    );
    row.set_key(
      line.keys_off.map(x => string_to_key(x)),
      false
    );
    if (line.lstick_changes) {
      row.set_stick(true, new StickPos(...line.lstick_pos_polar));
    }
    if (line.rstick_changes) {
      row.set_stick(false, new StickPos(...line.rstick_pos_polar));
    }
  }
  constructor(options?: PianoRollRowConstructorOptions) {
    if (options) {
      // destructuring options for less unreadable code
      this.has_previous = Boolean(options.previous);
      this.reference = options.reference || null;
      this.current_frame = options.frame || options.previous.current_frame + 1;
      this.active_keys = options.active_keys || new KeysList();
      // re-call constructor to fix range issues, i.e. magnitude over 32767
      if ("lstick_pos" in options) {
        this.lstick_pos = new StickPos(
          options.lstick_pos.angle,
          options.lstick_pos.magnitude
        );
      }
      if ("rstick_pos" in options) {
        this.rstick_pos = new StickPos(
          options.rstick_pos.angle,
          options.rstick_pos.magnitude
        );
      }
      if (options.previous) {
        // clone calculation
        // iterating over every key pressed in the previous frame, if it is pressed here too, it's a clone key
        for (const key of PianoRollRow.all_keys) {
          const this_has = this.active_keys.has(key);
          const prev_has = options.previous.active_keys.has(key);
          if (this_has === prev_has) {
            this.cloned_on_keys.append(key);
          } else if (this_has) {
            this.on_keys.append(key);
          } else {
            this.off_keys.append(key);
          }
        }
        // check the same way for sticks
        this.is_lstick_clone = this.lstick_pos.equals(
          options.previous.lstick_pos
        );
        this.is_rstick_clone = this.rstick_pos.equals(
          options.previous.rstick_pos
        );
        // if both sticks are cloned, and this.clone_keys has the same length as this.active_keys, this object is a clone
        this.is_clone =
          this.is_lstick_clone &&
          this.is_rstick_clone &&
          this.cloned_on_keys.length() === Object.keys(Key).length;
      }
    } else {
      this.is_lstick_clone = false;
      this.is_rstick_clone = false;
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
    const lstick_btn = create_stick_element(true);
    const rstick_btn = create_stick_element(false);
    this.key_references.KEY_LSTICK = lstick_btn;
    this.key_references.KEY_RSTICK = rstick_btn;
    row.append(lstick_btn).append(rstick_btn);
    // Joysticks
    const lstick = create_joystick_element(true, this);
    const rstick = create_joystick_element(false, this);
    this.key_references.STICK_LSTICK = lstick;
    this.key_references.STICK_RSTICK = rstick;
    row.append(lstick).append(rstick);
    // Add and remove row buttons
    row
      .append(
        $("<td/>")
          .append(
            $("<button/>")
              .addClass("add_button")
              .click(async function () {
                const row = $(this).parents("tr").data("object");
                let add_count: number;
                if (row.owner.key_state.shift) {
                  add_count =
                    +(await request_prompt("How many rows?", "1")) || 1;
                  const position = row.owner.get_position(row) + 1;
                  for (let i = 0; i < add_count; i++) {
                    row.owner.add(null, position);
                  }
                } else {
                  row.owner.add(null, row.owner.get_position(row) + 1);
                }
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
    } else if (this.owner?.show_clones) {
      // if we are currently showing clones as a whole
      this.show_children();
    } else if (!this.expand_clones && !this.owner?.show_clones) {
      // if we are currently not showing clones as a whole and we are also not showing them here
      this.show_children();
      this.expand_clones = !this.expand_clones;
    }
  }
  toggle_key(key: Key): void {
    if (key === Key.NONE) return;
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
  set_key(keys: Key[] | Key, pressed?: boolean): void {
    if (!(keys instanceof Array)) {
      keys = [keys];
    }
    if (pressed) {
      for (const key of keys) {
        if (this.active_keys.has(key)) continue;
        this.toggle_key(key);
      }
    } else {
      for (const key of keys) {
        if (!this.active_keys.has(key)) continue;
        this.toggle_key(key);
      }
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
  set_stick(
    is_lstick: boolean,
    pos: StickPos,
    use_for_comparison?: StickPos
  ): void {
    if (
      pos.equals(
        use_for_comparison ||
          (is_lstick ? this.previous.lstick_pos : this.previous.rstick_pos)
      )
    ) {
      if (is_lstick) this.is_lstick_clone = true;
      else this.is_rstick_clone = true;
    } else {
      if (is_lstick) {
        this.lstick_pos = pos.clone();
        this.is_lstick_clone = false;
      } else {
        this.is_rstick_clone = false;
        this.rstick_pos = pos.clone();
      }
    }
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
    if (this.on_keys.length() === 0 && this.off_keys.length() === 0)
      this.all_keys_cloned = true;
    else this.all_keys_cloned = false;
    return;
  }
  reeval_sticks(previous: PianoRollRow): void {
    if (this.frozen || !this.previous) return;
    if (this.is_lstick_clone) this.lstick_pos = previous.lstick_pos.clone();
    if (this.is_rstick_clone) this.rstick_pos = previous.rstick_pos.clone();
  }
  reeval(previous: PianoRollRow, hide_clones?: boolean): void {
    if (this.frozen) return;
    if (!previous) previous = this.previous || null;
    this.previous = previous;
    this.reeval_keys(previous, false);
    this.reeval_sticks(previous);
    this.is_row_owner = false;
    // Update whether this row is a clone
    if (this.all_keys_cloned) {
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
      if (this.associated_spacer) {
        this.associated_spacer.fadeIn(400);
      }
    } else {
      this.reference.fadeOut(400);
      if (this.associated_spacer) {
        this.associated_spacer.fadeOut(400);
      }
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
      this.get_row_children().forEach((child): void => {
        child.show(should_show);
      });
    }
  }
}

interface PianoRollKeyState {
  [key: string]: boolean;
}

class StickChangeDialogue {
  reference: JQuery<HTMLElement>;
  pointing_to: JQuery<HTMLElement>;
  pointing_to_lstick = false;
  in_row: PianoRollRow;
  owner: PianoRoll;
  constructor(owner: PianoRoll) {
    this.owner = owner;
    const element: JQuery<HTMLElement> = $("<div/>")
      .data("object", this)
      .addClass("stick_change_dialogue")
      .css("z-index", 100)
      .append(
        $("<table/>")
          .addClass("stick_change_table")
          .append(
            $("<tr/>")
              .addClass("stick_change_labels")
              .append($("<td/>").addClass("stick_change_label").text("Angle:"))
              .append(
                $("<td/>").addClass("stick_change_label").text("Magnitude:")
              )
          )
          .append(
            $("<tr/>")
              .addClass("stick_change_inputs")
              .append(
                $("<td/>").append(
                  $("<input/>")
                    .addClass("stick_change_input angle")
                    .val(0)
                    .attr("type", "number")
                )
              )
              .append(
                $("<td/>").append(
                  $("<input/>")
                    .addClass("stick_change_input magnitude")
                    .val(0)
                    .attr("type", "number")
                )
              )
          )
      )
      .mouseleave(function () {
        const self = $(this);
        const object: StickChangeDialogue = self.data("object");
        // Set the position to a new position with the angle typed and the old magnitude
        object.in_row.set_stick(
          object.pointing_to_lstick,
          new StickPos(
            +self.find(".angle").val(),
            +self.find(".magnitude").val()
          )
        );
        self.fadeOut(200, function () {
          $(this).find(".angle").val(0);
          $(this).find(".magnitude").val(0);
        });
        object.in_row = null;
        object.pointing_to = null;
        object.pointing_to_lstick = null;
      });
    this.reference = element;
    $("body").append(element); // add element to the body
    element.fadeOut(0);
  }
  point_to(row: PianoRollRow, point_to_lstick: boolean): void {
    if (
      this.pointing_to !== null &&
      this.pointing_to !== void 0 &&
      this.in_row !== null
    ) {
      this.in_row.set_stick(
        this.pointing_to_lstick,
        new StickPos(
          +this.reference.find(".angle").val(),
          +this.reference.find(".magnitude").val()
        )
      );
    }
    this.in_row = row;
    this.pointing_to = row.reference.find(
      point_to_lstick ? ".lstick_el" : ".rstick_el"
    );
    this.pointing_to_lstick = point_to_lstick;
    this.reference
      .find(".angle")
      .val(
        (point_to_lstick ? row.lstick_pos.angle : row.rstick_pos.angle) || 0
      );
    this.reference
      .find(".magnitude")
      .val(
        point_to_lstick ? row.lstick_pos.magnitude : row.rstick_pos.magnitude
      );
    const coordinates = this.pointing_to.offset();
    const window_width = $(window).width();
    console.log("window_width: ", window_width);
    const left_edge = this.reference.outerWidth() + coordinates.left;
    console.log("left_edge: ", left_edge);
    this.reference.css({
      top: coordinates.top + this.pointing_to.height() + 10,
      left:
        left_edge > window_width
          ? coordinates.left - (left_edge - window_width)
          : coordinates.left,
      position: "absolute",
    }); // move the dialogue to below the stick clicked
    this.reference.fadeIn(200);
  }
}

interface PianoRollConstructorOptions {
  contents: PianoRollRow[];
  reference: JQuery<HTMLElement>;
  jquery_document?: JQuery<Document>;
  navbar?: JQuery<HTMLElement>;
  no_add_row?: boolean;
  no_await_ipc?: boolean;
}

export class PianoRoll {
  readonly contents: PianoRollRow[];
  private reference: JQuery<HTMLElement>;
  readonly key_state: PianoRollKeyState = {}; // for keeping track of pressed keys
  stick_change_dialogue: StickChangeDialogue;
  navbar?: JQuery<HTMLElement>;
  show_clones = true;
  saved = false;
  frozen = false;
  representing?: string;
  switch?: IpAddress;
  export_name?: string;
  temp_id?: string;
  show_export_success = true;
  static from = async function (
    filepath: string,
    options: PianoRollConstructorOptions,
    should_decompile?: boolean
  ): Promise<PianoRoll | null> {
    let file: string[];
    try {
      file = (await read_FileLike(filepath)).as_array();
    } catch (err) {
      console.error(err);
      return null;
    }
    if (should_decompile) {
      file = decompile(file, true, false).split(/(?:\r\n|\r|\n)/);
    }
    const piano = new PianoRoll(options);
    let last_frame = 0;
    // Preprocess the script so we don't have to deal with crazy loops and stuff
    const preprocessor = new Preprocessor(file);
    preprocessor.do_all();
    file = preprocessor.current_content;
    // Deal with script now
    let is_in_project_data = false;
    const project_data: string[] = [];
    for (const line of file) {
      if (/^(?:\s+)?\/\/(?:\s+)Project Data/i.test(line)) {
        is_in_project_data = true;
        continue;
      }
      if (is_in_project_data) {
        if (!line.trim().startsWith("//")) {
          is_in_project_data = false;
        } else {
          project_data.push(line);
          continue;
        }
      }
      // We're parsing a line now
      if (!/^([0-9]+|\+) /.test(line)) continue;
      const parsed = parse_line(line, last_frame === 0 ? 1 : last_frame, false);
      for (let i = 0; i < parsed.frame - last_frame; i++) {
        piano.add(null);
      }
      last_frame = parsed.frame;
      const last = piano.get(piano.contents.length - 1);
      PianoRollRow.apply(last, parsed);
    }
    PianoRoll.apply(project_data, piano);
    piano.set_represented(filepath);
    piano.set_saved(true);
    return piano;
  };
  static apply(project_data: string[], piano: PianoRoll): void {
    for (const line of project_data) {
      if (line === "// Project Data") continue;
      const result = /^(?:\s+)?\/\/(?:\s+)([a-z0-9_]+):([a-z0-9_,.]+)$/i.exec(
        line
      );
      if (!result) continue;
      const [, key, value] = result;
      switch (key) {
        case "row_show_clones": {
          for (const row_number of value.split(",").map(x => +x)) {
            piano.get(row_number)?.show_children(true);
          }
          break;
        }
        case "switch_ip": {
          try {
            piano.switch = new IpAddress(value);
          } catch (err) {
            console.error(err);
          }
          break;
        }
        case "export_name": {
          piano.export_name = value;
          break;
        }
        case "temp_id": {
          piano.temp_id = value;
          break;
        }
        case "flags": {
          for (const flag of value.split(",")) {
            switch (flag) {
              case "no_clones": {
                piano.show_clones = false;
                break;
              }
              case "no_show_export_success": {
                piano.show_export_success = false;
                break;
              }
            }
          }
        }
      }
    }
    piano.refresh();
  }
  static click_handler_func = function (): void {
    $(this).parent().data("object").toggle_key($(this).data("value")); // get the clicked element's parent,
    // get the PianoRollRow object corresponding to that, then toggle the corresponding key
  };
  static create_spacer_row = function (): JQuery<HTMLElement> {
    return $("<tr/>").addClass("row_spacer");
  };
  constructor(options: PianoRollConstructorOptions) {
    this.contents = options.contents;
    this.reference = options.reference;
    this.reference.data("object", this);
    this.temp_id = rand_string(15);
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
    if (!options.no_add_row) {
      this.add(null, 0);
    }
    if (!options.no_await_ipc) {
      this.await_ipc();
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    $(".key").click(PianoRoll.click_handler_func);
    this.stick_change_dialogue = new StickChangeDialogue(this);
  }
  destroy(): void {
    this.reference.empty();
    this.navbar.empty();
    while (this.contents.length > 0) {
      this.contents.shift();
    }
    delete this.reference;
    Object.seal(this);
  }
  set_frozen(unfreeze?: boolean): void {
    this.frozen = !unfreeze;
  }
  await_ipc(): void {
    // Handles all ipc messages sent to this page's webContents
    // Requests channel
    ipcRenderer.on(
      "requests",
      (event: Electron.IpcRendererEvent, data: any) => {
        if (typeof data === "string") {
          switch (data) {
            case "request_save": {
              this.export(true).then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
            case "request_save_as": {
              this.export(true, true).then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
            case "request_export": {
              this.export().then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
            case "request_export_nx_tas": {
              this.export(false, false, true).then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
            case "request_export_to_switch": {
              this.export_ftp().then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
            case "request_enter_ip": {
              this.ask_for_ip().then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
            case "request_enter_export_name": {
              this.ask_for_export_name().then(
                () => void 0,
                reason => console.error(reason)
              );
              break;
            }
          }
        }
      }
    );
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
                  owner_piano.export(false, true).then(
                    () => void 0,
                    reason => console.error(reason)
                  );
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
                  owner_piano.export(false, false, true).then(
                    () => void 0,
                    reason => console.error(reason)
                  );
                })
                .data("owner", this)
                .text("Export as nx-TAS Script")
            )
            .addClass("navbar_button")
        )
        .append(
          $("<td/>")
            .append(
              $("<button/>")
                .addClass("export_to_switch navbar_element")
                .click(function () {
                  const owner_piano: PianoRoll = $(this).data("owner");
                  owner_piano.export_ftp().then(
                    () => void 0,
                    reason => console.error(reason)
                  );
                })
                .data("owner", this)
                .text("Export to Switch")
            )
            .addClass("navbar_button")
        )
        .append($("<td/>").addClass("navbar_spacer"))
    );
  }
  async ask_for_ip(): Promise<void> {
    const response = await request_prompt(
      "Enter the local IP address of your Switch."
    );
    if (response === "cancel") return;
    let switch_ip: IpAddress;
    try {
      switch_ip = new IpAddress(response);
    } catch (err) {
      console.error(err);
      return;
    }
    if (switch_ip.did_succeed) {
      this.switch = switch_ip;
    } else {
      IpAddress.error_from(switch_ip, remote.getCurrentWindow()).then(
        () => void 0,
        reason => console.error(reason)
      );
    }
  }
  async ask_for_export_name(): Promise<void> {
    const response = await request_prompt("Enter the name to export as.");
    if (response === "cancel") return;
    if (!/^[0-9a-zA-Z.-]+$/.test(response)) {
      await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
        message: "Invalid Export Name",
        detail: "You can only use '.', '-', and alphanumeric characters.",
        type: "error",
        buttons: ["OK"],
      });
      return;
    }
    this.export_name = response;
  }
  async export_ftp(): Promise<void> {
    const this_window = remote.getCurrentWindow();
    if (!this.export_name) {
      await this.ask_for_export_name();
      if (!this.export_name) return;
    }
    if (!this.switch) {
      await this.ask_for_ip();
      if (!this.switch) return;
    }
    let is_replacing = false;
    try {
      is_replacing = await this.switch.exists(
        "/scripts/",
        this.export_name,
        5000
      );
    } catch (err) {
      console.error(err);
      await remote.dialog.showMessageBox(this_window, {
        title: "Error",
        message: err.toString(),
        type: "error",
        buttons: ["OK"],
      });
      return;
    }
    if (is_replacing) {
      const should_replace = await remote.dialog.showMessageBox(this_window, {
        message: `This will overwrite /scripts/${this.export_name} on the Switch. The current file will be backed up, however do you still want to proceed?`,
        type: "question",
        buttons: ["Cancel", "Replace"],
      });
      if (should_replace.response === 0) {
        return;
      }
    }
    const temp_path = join(remote.app.getPath("temp"), `${this.temp_id}.txt`);
    try {
      await write_file_async(temp_path, this.make_nx_tas(false).as_string());
    } catch (err) {
      console.error(err);
      await remote.dialog.showMessageBox(this_window, {
        title: "Error",
        message: err.toString(),
        type: "error",
        buttons: ["OK"],
      });
      return;
    }
    let result;
    try {
      result = await this.switch.send(temp_path, this.export_name, 5000);
    } catch (err) {
      console.error(err);
      await remote.dialog.showMessageBox(this_window, {
        title: "Error",
        message: err.toString(),
        type: "error",
        buttons: ["OK"],
      });
      return;
    }
    if (this.show_export_success) {
      const button = await remote.dialog.showMessageBox(this_window, {
        message: result.did_succeed
          ? "Sucessfully exported script to Switch."
          : "Export failed.",
        type: "info",
        buttons: ["OK", "Do not show this again"],
      });
      if (button.response === 1) {
        this.show_export_success = false;
      }
    }
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
  async export(
    saved?: boolean,
    save_as?: boolean,
    nx_tas?: boolean
  ): Promise<string> {
    const path = await export_file({
      file: nx_tas ? this.make_nx_tas() : this.make_better_scripts(true, saved),
      title: `${saved ? "Save" : "Export"} ${
        nx_tas ? "nx-TAS" : "Better Scripts"
      } Script`,
      default_name: `script1.${nx_tas ? "txt" : "tig"}`,
      browser_window: remote.getCurrentWindow(),
      path: (save_as ? void 0 : saved ? this.representing : void 0) || void 0, // if path is undefined, export_file will have a
      // dialog show up to pick the filepath
    });
    if (path === "") return;
    if (saved) {
      this.set_saved(true);
      this.set_represented(path);
    }
    return path;
  }
  add(
    element: JQuery<HTMLElement> | null,
    position?: number,
    use_previous = true
  ): PianoRollRow {
    const position_set = !!position;
    position = position !== void 0 ? position : last_index_of(this.contents);
    const previous_in_position = this.get(position) || new PianoRollRow();
    const input_line = new PianoRollRow({
      previous: use_previous ? previous_in_position : null,
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
      const spacer_row = PianoRoll.create_spacer_row();
      input_line.associated_spacer = spacer_row;
      if (this.contents.length === 0 || !position_set) {
        this.reference.append(element).append(spacer_row);
      } else {
        this.get(position > 0 ? position - 1 : 0).associated_spacer.after(
          element
        );
        element.after(spacer_row);
      }
    }
    if (!position_set) {
      this.contents.push(input_line);
    } else {
      this.contents.splice(position, 0, input_line);
    }
    this.refresh();
    return input_line;
  }
  remove(position: number): void {
    const in_position = this.get(position);
    in_position.reference.remove();
    if (in_position.associated_spacer) {
      this.get(position).associated_spacer.remove();
    }
    this.contents.splice(position, 1);
    this.refresh();
  }
  set_represented(path: string): void {
    ipcRenderer.send("save_events", {
      is_represented_update: true,
      path: path,
    });
    this.representing = path;
  }
  set_saved(saved?: boolean): void {
    this.saved = saved;
    ipcRenderer.send("save_events", saved ? "saved" : "unsaved");
  }
  refresh(): void {
    if (this.frozen) return;
    // EXTREMELY INTENSIVE
    this.get(0).reeval(new PianoRollRow());
    for (let i = 1; i < this.contents.length; i++) {
      this.get(i).reeval(this.get(i - 1), !this.show_clones);
    }
    // re-bind click events for new elements
    $(".key").off("click");
    // eslint-disable-next-line @typescript-eslint/unbound-method
    $(".key").click(PianoRoll.click_handler_func);
    // tell main process this document is unsaved
    this.set_saved(false);
  }
  make_update_frames(): ParsedLine[] {
    const to_return: ParsedLine[] = [];
    for (const line of this.contents) {
      if (!line.is_clone || line.current_frame <= 1) {
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
  make_project_data(): string {
    let data_buffer = "// Project Data\r\n";
    const flags = [];
    if (!this.show_clones) {
      flags.push("no_clones");
      if (this.contents.length > 1) {
        data_buffer += "// row_show_clones:";
        const showing: string[] = [];
        for (let i = 0; i < this.contents.length; i++) {
          if (this.contents[i].expand_clones) showing.push(i.toString(16));
        }
        data_buffer += `${showing.join(",")}\r\n`;
      }
    }
    if (this.switch) {
      data_buffer += `// switch_ip:${this.switch.parts.join(".")}\r\n`;
    }
    if (this.export_name) {
      data_buffer += `// export_name:${this.export_name}\r\n`;
    }
    if (this.temp_id) {
      data_buffer += `// temp_id:${this.temp_id}\r\n`;
    }
    if (!this.show_export_success) {
      flags.push("no_show_export_success");
    }
    return data_buffer + `// flags:${flags.join(",")}`;
  }
  make_better_scripts(
    array?: boolean,
    include_project_data?: boolean
  ): FileLike {
    let input_data: FileLike;
    if (array) {
      input_data = new FileLike(
        script_from_parsed_lines(this.make_update_frames())
      );
    } else {
      input_data = new FileLike(
        script_from_parsed_lines(this.make_update_frames()).join("\n")
      );
    }
    if (include_project_data) {
      const project_data = new FileLike(this.make_project_data());
      return project_data.join(input_data);
    } else {
      return input_data;
    }
  }
  make_nx_tas(throw_errors?: boolean): FileLike {
    return new FileLike(
      compile([], throw_errors, true, this.make_update_frames())
    );
  }
}
