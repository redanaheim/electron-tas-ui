import { ScriptFunction, ScriptFunctionExports, repeat } from "./classes";

import { get_builtin } from "../compiling_builtins/builtin_names";

interface InternalVariables {
  [key: string]: string;
}

const macro_modify = function (
  macro: ScriptFunction,
  matches: string[]
): string[] | false {
  const modifiers: any = {}; // keys: line number to add to, values: what to add
  if (matches.length % 2 === 1 || matches.length < 4) {
    return false;
  }
  for (let i = 2; i < matches.length; i += 2) {
    // start at 3rd element; first two are irrelevant
    modifiers[Number(matches[i])] = matches[i + 1]; // the contents to add to the line are in odd indexes
  }
  const to_return = [];
  for (let i = 0; i < macro.internal_actions.length; i++) {
    let current_line = macro.internal_actions[i];
    for (const key of Object.keys(modifiers)) {
      // iterate through modifiers
      if (i + 1 === Number(key)) {
        current_line += " " + modifiers[Number(key)];
      }
    }
    to_return.push(current_line);
  }
  return to_return;
};

export class Preprocessor {
  // Regexes for deciding what lines are
  static builtins_regex = /^BUILTINS ([A-Z]+)$/i;
  static loop_regex = /^REP ([A-Z]+) ([1-9][0-9]*)$/i;
  static macro_regex = /^DEF ?([A-Z]+) ?\{$/i;
  static macro_invocation_regex = /^([A-Z]+)$/i;
  static macro_parameter_regex = /^([A-Z]+) ?<(?:([1-9][0-9]*):([^-]+))(?:-([1-9][0-9]*):([^-]+))*>$/i;
  static variable_regex = /^VAL ([A-Z]+) ?= ?(.+)$/i;
  static action_line_regex = /^([0-9]+|\+) .+$/i;
  static variable_invocation_regex = /\$([A-Z]+)/i;
  vars?: InternalVariables = {};
  macros?: ScriptFunctionExports = { functions: [] };
  current_content: string[];
  constructor(file_lines: string[]) {
    this.current_content = file_lines;
  }
  do_all(): void {
    this.get_macros();

    this.process_invocations();

    this.process_vars();
  }
  process_vars(): void {
    for (let i = 0; i < this.current_content.length; i++) {
      const line = this.current_content[i];
      if (Preprocessor.variable_regex.test(line)) {
        const matches = Preprocessor.variable_regex.exec(line);
        this.vars[matches[1].toLowerCase()] = matches[2]; // take the captured groups
        this.current_content.splice(i, 1);
        i--;
      } else if (Preprocessor.variable_invocation_regex.test(line)) {
        let new_line = line;

        const matches = Preprocessor.variable_invocation_regex.exec(line);
        matches.shift();
        for (const match of matches) {
          // iterate over all variable invocations in this line
          new_line = new_line.replace(
            new RegExp(`\\$${match}`, "i"),
            this.vars[match.toLowerCase()] || ""
          ); // replace invocations of
          // this specific variable with its value
        }
        this.current_content.splice(i, 1, new_line); // replace line
      }
    }
  }
  get_macros(): void {
    // Loop through lines; find definition of functions and replace all instances of them
    let in_definition = false;
    let script_functions: ScriptFunction[] = []; // initialize with none
    let current_function = new ScriptFunction("", [], false);
    for (let i = 0; i < this.current_content.length; i++) {
      let line = this.current_content[i];
      if (Preprocessor.builtins_regex.test(line)) {
        // is line importing builtins?
        // Get name of requested builtin and then add all of those functions to script_functions
        script_functions = script_functions.concat(
          get_builtin(Preprocessor.builtins_regex.exec(line)[1].toLowerCase())
        );
        this.current_content.splice(i, 1);
        i--; // we will be ahead of where we should be if we delete the element and continue looping.
      } else if (Preprocessor.macro_regex.test(line)) {
        // is line defining a macro?

        in_definition = true;
        current_function = new ScriptFunction(
          Preprocessor.macro_regex.exec(line)[1].toLowerCase(),
          [],
          true
        );
        this.current_content.splice(i, 1);
        i--;
      } else if (/^\}$/.test(line) && in_definition) {
        // is line ending a macro definition?
        in_definition = false;
        if (current_function.active) {
          script_functions.push(current_function);
          current_function = ScriptFunction.de_init();
        }
        this.current_content.splice(i, 1);
        i--;
      } else if (in_definition === true && current_function.active) {
        line = line.trim();
        if (Preprocessor.action_line_regex.test(line) === false) continue; // ignore invalid lines
        current_function.internal_actions.push(line);
        this.current_content.splice(i, 1);
        i--;
      }
    }
    this.macros.functions = script_functions;
  }
  process_invocations(): void {
    for (let i = 0; i < this.current_content.length; i++) {
      const line = this.current_content[i];
      if (Preprocessor.macro_invocation_regex.test(line)) {
        // is the line maybe invoking a macro?
        let matching_function: ScriptFunction | null = null;
        for (const script_function of this.macros.functions) {
          // check for matching macros
          if (script_function.name.toLowerCase() === line.toLowerCase()) {
            matching_function = script_function;
          }
        }
        if (matching_function !== null) {
          this.current_content.splice(
            i,
            1,
            ...matching_function.internal_actions
          ); // replace this line with
          // the contents of the macro
        } else {
          continue;
        }
      } else if (Preprocessor.macro_parameter_regex.test(line)) {
        const contents = Preprocessor.macro_parameter_regex.exec(line);
        const macro_name = contents[1];
        let matching_function: ScriptFunction | null = null;
        for (const script_function of this.macros.functions) {
          if (script_function.name.toLowerCase() === macro_name.toLowerCase()) {
            matching_function = script_function;
          }
        }
        if (matching_function !== null) {
          this.current_content.splice(
            i,
            1,
            ...(macro_modify(matching_function, contents) ||
              matching_function.internal_actions)
          ); // replace this line with
          // the contents of the macro
        } else {
          continue;
        }
      } else if (Preprocessor.loop_regex.test(line)) {
        const contents = Preprocessor.loop_regex.exec(line);
        const macro_name = contents[1]; // first index is entire matching object, we only care about the captured groups
        const reps = Number(contents[2]);
        let matching_function: ScriptFunction | null = null;
        for (const script_function of this.macros.functions) {
          if (script_function.name.toLowerCase() === macro_name.toLowerCase()) {
            matching_function = script_function;
          }
        }
        if (matching_function !== null) {
          this.current_content.splice(
            i,
            1,
            ...repeat(matching_function.internal_actions, reps)
          ); // replace this line with
          // the contents of the macro
        } else {
          continue;
        }
      }
    }
  }
}
