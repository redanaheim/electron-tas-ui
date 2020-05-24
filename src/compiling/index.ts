import { read_file_async, write_file_async, Store } from "../storing";
import { fstat, existsSync } from "fs";
import { compile } from "../assets/compile";

// import { basename } from "path";
const { dialog, BrowserWindow } = require("electron").remote;
export const on_init = async function (): Promise<void> {
  // Set input values to ones from last time
  let last_values = new Store("last_input_values", {
    compiling_file_path: "",
    compiling_save_path: "",
    is_default: true,
  });
  let { compiling_file_path, compiling_save_path } = await last_values.data;
  $("#file_path").val(compiling_file_path);
  $("#save_path").val(compiling_save_path);
};
export const pick_file = async function (): Promise<string> {
  let path = (
    await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ["openFile"],
    })
  ).filePaths[0];
  if (path) $("#file_path").val(path);
  return path;
};
export const pick_save_path = async function (): Promise<void> {
  let save_path = await dialog.showSaveDialog(
    BrowserWindow.getFocusedWindow(),
    {
      properties: ["createDirectory", "showOverwriteConfirmation"],
      defaultPath: "script1.txt",
    }
  );
  if (save_path.canceled) return;
  $("#save_path").val(save_path.filePath || "");
  return save_path;
};
export const compile_on_click = async function () {
  const this_window = BrowserWindow.getFocusedWindow();
  let save_path = $("#save_path").val().toString();
  let source_path = $("#file_path").val().toString();

  // Store input values from this and use them as defaults next time
  let last_values = new Store("last_input_values", {
    compiling_file_path: "",
    compiling_save_path: "",
    is_default: true,
  });
  last_values.make({
    compiling_file_path: source_path,
    compiling_save_path: save_path,
    is_default: false,
  });

  if (existsSync(source_path) === false) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Source Path",
      details: "The given path does not point to a file.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  let file_content = (await read_file_async(source_path, "utf8")).toString();
  try {
    await write_file_async(save_path, compile(file_content));
  } catch (err) {
    await dialog.showMessageBox(this_window, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  let show_dialog_selections = await new Store("dialogs", {
    show_compile_success: true,
    show_export_success: true,
    is_default: true,
  });
  if (await show_dialog_selections.get("show_compile_success")) {
    let button = await dialog.showMessageBox(this_window, {
      message: "Sucessfully saved compiled script.",
      type: "info",
      buttons: ["OK", "Do not show this again"],
    });
    if (button.response === 1) {
      show_dialog_selections.set("show_compile_success", false);
    }
  }
};
