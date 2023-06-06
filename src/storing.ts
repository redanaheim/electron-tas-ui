import { app, BrowserWindow, dialog } from "electron";
import { readFile, writeFile, createReadStream } from "fs";
import * as readline from "readline";
import { join } from "path";
import { FileLike } from "./assets/compiling/classes";
const remote = process.type === "browser" ? require("@electron/remote/main") : require("@electron/remote");

interface InternalData {
  [key: string]: any;
  is_default: boolean;
}

/**
 * Works the same as fs.readFile but returns a promise instead of using callback
 */
export const read_file_async = async function (
  path: string,
  encoding: string
): Promise<string> {
  path = join(path);
  return new Promise((res, rej) => {
    readFile(path, encoding, (err: any, data: any) => {
      if (err) rej(err);
      else res(data);
    });
  });
};
export const read_FileLike = async function (path: string): Promise<FileLike> {
  path = join(path);
  return new Promise((res, _rej) => {
    const buffer: string[] = [];
    const readlines = readline.createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity,
    });
    readlines.on("line", line => {
      buffer.push(line);
    });
    readlines.on("close", () => {
      res(new FileLike(buffer) as any);
    });
  });
};
/**
 * Works the same as fs.writeFile but returns a promise instead of using callback
 */
export const write_file_async = async function (
  path: string,
  data: string
): Promise<boolean> {
  path = join(path);
  return new Promise((res, rej) => {
    writeFile(path, data, (err: Error) => {
      if (err) rej(err);
      else res(true);
    });
  });
};

/**
 * Returns a promise to data stored in JSON at the given path.
 * @param path Path to JSON file to read
 * @param def Default return value if no valid JSON is found
 */
async function get_data(
  path: string,
  def: InternalData
): Promise<InternalData> {
  let data: any;
  try {
    data = await read_file_async(path, "utf8");
  } catch (err) {
    def.is_default = true;
    return def;
  }
  data = JSON.parse(data);
  data.is_default = false;
  return data;
}

export class Store {
  path: string;
  data: Promise<InternalData>;
  /**
   * Gets the value of a property of a specific store.
   * Used as shorthand for creating a whole new object then calling get.
   */
  static value_of = async function (
    store_name: string,
    property: keyof InternalData,
    defaults?: InternalData
  ): Promise<InternalData[keyof InternalData]> {
    const instance = new Store(store_name, defaults || { is_default: false });
    let data: Promise<InternalData[keyof InternalData]>;
    try {
      data = await instance.get(property, defaults);
    } catch (err) {
      data = new Promise((res, _rej) => {
        res(defaults);
      });
      console.error(err);
    }
    return data;
  };
  /**
   * Creates a database for storing persistent information
   * @param filename Path to the file that the JSON is stored in
   * @param defaults Object to set as the instance's internal data if it doesn't exist
   */
  constructor(filename: string, defaults: InternalData) {
    if (app) {
      const storing_path = app.getPath("userData");
      this.path = join(storing_path, filename + ".json");
    } else {
      const storing_path = remote.app.getPath("userData");
      this.path = join(storing_path, filename + ".json");
    }
    this.data = get_data(this.path, defaults);
  }
  /**
   * Returns the value of the property as stored in the instance
   * @param property Property to return the value of
   */
  async get(
    property: keyof InternalData,
    defaults?: InternalData
  ): Promise<InternalData[keyof InternalData]> {
    const data = await this.data;
    if (!defaults) return data[property];
    return data[property] === void 0 ? defaults[property] : data[property];
  }
  /**
   * Changes the value of a property as stored in the instance
   */
  async set(property: any, value: any): Promise<any> {
    let data: InternalData;
    try {
      data = await this.data;
    } catch (err) {
      return err;
    }
    data[property] = value;
    let res: any;
    try {
      res = await write_file_async(this.path, JSON.stringify(data));
    } catch (err) {
      return err;
    }
    return res;
  }
  /**
   * Iterates over the parameter, changing every value of the internal data to the value of the property in the object.
   * For example,
   * ```
   * foo.make({
   *  "bar": "foo",
   *  "baz": "qux"
   * })
   * ```
   * would set internal properties `bar` and `baz` to `foo` and `qux` respectively.
   */
  async make(obj: InternalData): Promise<any> {
    let data: InternalData;
    try {
      data = await this.data;
    } catch (err) {
      return err;
    }
    // Set each property from the object given
    for (const key of Object.keys(obj)) {
      data[key] = obj[key];
    }
    let res: any;
    try {
      res = await write_file_async(this.path, JSON.stringify(data));
    } catch (err) {
      return err;
    }
    return res;
  }
}

export const store_defaults = {
  config: {
    theme: "dark",
    is_default: true,
  },
  last_input_values: {
    compiling_file_path: "",
    compiling_save_path: "",
    decompiling_file_path: "",
    decompiling_save_path: "",
    preprocessing_file_path: "",
    preprocessing_save_path: "",
    js_compiling_file_path: "",
    js_compiling_save_path: "",
    compiling_exporting_source_path: "",
    compiling_exporting_export_name: "script1.txt",
    compiling_exporting_switch_ip: "1.1.1.1",
    js_compiling_exporting_source_path: "",
    js_compiling_exporting_export_name: "script1.txt",
    js_compiling_exporting_switch_ip: "1.1.1.1",
    exporting_source_path: "",
    exporting_export_name: "script1.txt",
    exporting_switch_ip: "1.1.1.1",
    is_default: true,
  },
  dialogs: {
    show_compile_success: true,
    show_compiler_errors: true,
    show_export_success: true,
    show_decompiler_success: true,
    show_decompiler_errors: true,
    all_exporting_show_replace: true,
    is_default: true,
  },
  preferences: {
    decompiling_perfect_decimal_match: true,
    is_default: true,
  },
};

interface ExportFileOptions {
  file: FileLike;
  title?: string;
  path?: string;
  message?: string;
  field_label?: string;
  no_replace_prompt?: boolean;
  browser_window?: BrowserWindow;
  create_directory?: boolean;
  show_hidden?: boolean;
  button_label?: string;
  default_name?: string;
}

export const export_file = async function (
  options: ExportFileOptions
): Promise<string> {
  let save_dialog: Electron.SaveDialogReturnValue;
  if (!options.path) {
    const properties_list: any = [];
    if (options.create_directory) {
      properties_list.push("createDirectory");
    }
    if (options.no_replace_prompt) {
      properties_list.push("showOverwriteConfirmation");
    }
    if (options.show_hidden) {
      properties_list.push("showHiddenFiles");
    }
    save_dialog = await (dialog ? dialog : remote.dialog).showSaveDialog(
      options.browser_window || null,
      {
        title: options.title || "",
        message: options.message || "",
        buttonLabel: options.button_label || void 0,
        nameFieldLabel: options.field_label || void 0,
        properties: properties_list,
        defaultPath: options.default_name || void 0,
      }
    );
    if (save_dialog.canceled) return "";
  }
  try {
    await write_file_async(
      options.path ? options.path : save_dialog.filePath,
      options.file.as_string()
    );
  } catch (err) {
    console.error(err);
  }
  if (!save_dialog) return options.path;
  return save_dialog.filePath;
};
