import {
  write_file_async,
  Store,
  store_defaults,
  read_FileLike,
} from "../storing";
import { existsSync } from "fs";
import { decompile } from "../assets/compiling/decompile";
// import { basename } from "path";
const { dialog, BrowserWindow } = require("@electron/remote");
export const on_init = async function (): Promise<void> {
  // Set input values to ones from last time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  const {
    decompiling_file_path,
    decompiling_save_path,
  } = await last_values.data;
  $("#file_path").val(decompiling_file_path);
  $("#save_path").val(decompiling_save_path);
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
export const pick_save_path = async function (): Promise<Electron.SaveDialogReturnValue> {
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
export const decompile_on_click = async function (): Promise<void> {
  const this_window = BrowserWindow.getFocusedWindow();
  const save_path = $("#save_path").val().toString();
  const source_path = $("#file_path").val().toString();

  // Store input values from this and use them as defaults next time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  last_values
    .make({
      decompiling_file_path: source_path,
      decompiling_save_path: save_path,
      is_default: false,
    })
    .then(
      () => void 0,
      reason => console.error(reason)
    );

  if (!existsSync(source_path)) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Source Path",
      detail: "The given path does not point to a file.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  const file_content = (await read_FileLike(source_path)).as_array();
  const decimals_allowed = await Store.value_of(
    "preferences",
    "decompiling_perfect_decimal_match",
    store_defaults.preferences
  );
  try {
    await write_file_async(
      save_path,
      decompile(
        file_content,
        await Store.value_of(
          "dialogs",
          "show_decompiler_errors",
          store_defaults.dialogs
        ),
        decimals_allowed
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
  const show_dialog_selections = new Store("dialogs", store_defaults.dialogs);
  if (await show_dialog_selections.get("show_decompile_success")) {
    const button = await dialog.showMessageBox(this_window, {
      message: "Sucessfully saved decompiled script.",
      type: "info",
      buttons: ["OK", "Do not show this again"],
    });
    if (button.response === 1) {
      show_dialog_selections.set("show_decompile_success", false).then(
        () => void 0,
        reason => console.error(reason)
      );
    }
  }
};
