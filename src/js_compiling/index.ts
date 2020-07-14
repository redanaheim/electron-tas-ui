import { write_file_async, Store, store_defaults } from "../storing";
import { create_tas_from_script } from "../assets/compiling/js_maker";
import { existsSync } from "fs";
import { compile } from "../assets/compiling/compile";
// import { basename } from "path";
const { dialog, BrowserWindow } = require("electron").remote;
export const on_init = async function (): Promise<void> {
  // Set input values to ones from last time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  const { compiling_file_path, compiling_save_path } = await last_values.data;
  $("#file_path").val(compiling_file_path);
  $("#save_path").val(compiling_save_path);
};
export const pick_file = async function (): Promise<string> {
  const path = (
    await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ["openFile"],
    })
  ).filePaths[0];
  if (path) $("#file_path").val(path);
  return path;
};
export const pick_save_path = async function (): Promise<void> {
  const save_path = await dialog.showSaveDialog(
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
export const compile_on_click = async function (): Promise<void> {
  const this_window = BrowserWindow.getFocusedWindow();
  const save_path = $("#save_path").val().toString();
  const source_path = $("#file_path").val().toString();

  // Store input values from this and use them as defaults next time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  last_values.make({
    js_compiling_file_path: source_path,
    js_compiling_save_path: save_path,
    is_default: false,
  });

  if (!existsSync(source_path)) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Source Path",
      detail: "The given path does not point to a file.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  let maker_function;
  let update_frames;
  try {
    if (require.cache[require.resolve(source_path)]) {
      delete require.cache[require.resolve(source_path)];
    }
    maker_function = require(source_path);
    update_frames = create_tas_from_script(maker_function);
  } catch (err) {
    console.error(err);
    await dialog.showMessageBox(this_window, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  try {
    await write_file_async(
      save_path,
      compile(
        "",
        await Store.value_of(
          "dialogs",
          "show_compiler_errors",
          store_defaults.dialogs
        ),
        true,
        update_frames
      )
    );
  } catch (err) {
    console.error(err);
    await dialog.showMessageBox(this_window, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  const show_dialog_selections = await new Store(
    "dialogs",
    store_defaults.dialogs
  );
  if (await show_dialog_selections.get("show_compile_success")) {
    const button = await dialog.showMessageBox(this_window, {
      message: "Sucessfully saved compiled script.",
      type: "info",
      buttons: ["OK", "Do not show this again"],
    });
    if (button.response === 1) {
      show_dialog_selections.set("show_compile_success", false);
    }
  }
};
