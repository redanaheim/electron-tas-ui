import { IpAddress } from "../ftp";
import { write_file_async, Store, store_defaults } from "../storing";
import { create_tas_from_script } from "../assets/compiling/js_maker";
import { compile } from "../assets/compiling/compile";
import { existsSync } from "fs";
import { join } from "path";
let path: any = null;
import { remote } from "electron";
const { app, dialog, BrowserWindow } = remote;
export const on_init = async function (): Promise<void> {
  // Set input values to ones from last time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  const {
    js_compiling_exporting_source_path,
    js_compiling_exporting_export_name,
    js_compiling_exporting_switch_ip,
  } = await last_values.data;
  $("#file_path").val(js_compiling_exporting_source_path);
  $("#path_on_switch").val(js_compiling_exporting_export_name);
  $("#switch_ip").val(js_compiling_exporting_switch_ip);
};
export const pick_file = async function (): Promise<string> {
  path = (
    await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ["openFile"],
    })
  ).filePaths[0];
  if (path) {
    $("#file_path").val(path);
  }
  return path;
};
export const send = async function (
  source_path: string,
  export_name: string,
  ip_text: string
): Promise<void> {
  const this_window = BrowserWindow.getFocusedWindow();
  if (!/^[0-9a-zA-Z.]+$/.test(export_name)) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Export Name",
      detail: "You can only use '.' and alphanumeric characters.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  const switch_ip = new IpAddress(ip_text);
  if (!switch_ip.did_succeed) {
    IpAddress.error_from(switch_ip, remote.getCurrentWindow()).then(
      () => void 0,
      reason => console.error(reason)
    );
    return;
  }
  let is_replacing: boolean;
  try {
    is_replacing = await switch_ip.exists("/scripts/", export_name, 5000);
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
  if (is_replacing) {
    const show_replace_dialog = await Store.value_of(
      "dialogs",
      "all_exporting_show_replace",
      store_defaults.dialogs
    );
    if (show_replace_dialog) {
      const should_replace = await dialog.showMessageBox(this_window, {
        message: `This will overwrite /scripts/${export_name} on the Switch. The current file will be backed up, however do you still want to proceed?`,
        type: "question",
        buttons: ["Cancel", "Replace"],
      });
      if (should_replace.response === 0) {
        // User clicked cancel
        return;
      }
    }
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
  // this is the path the compiled file will be stored to,
  // and where we want to get the file from before exporting to switch
  source_path = join(app.getPath("temp"), "compiled.txt");
  try {
    await write_file_async(
      source_path,
      compile(
        [],
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
  let result;
  try {
    result = await switch_ip.send(source_path, export_name, 5000);
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
  if (await show_dialog_selections.get("show_export_success")) {
    const button = await dialog.showMessageBox(this_window, {
      message: result.did_succeed
        ? "Sucessfully exported script to Switch."
        : "Export failed.",
      type: "info",
      buttons: ["OK", "Do not show this again"],
    });
    if (button.response === 1) {
      show_dialog_selections.set("show_export_success", false).then(
        () => void 0,
        reason => console.error(reason)
      );
    }
  }
};
export const send_on_click = async function (): Promise<void> {
  const this_window = BrowserWindow.getFocusedWindow();
  const source_path = $("#file_path").val().toString();
  if (!existsSync(source_path)) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Source Path",
      detail: "The given path does not point to a file.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  const export_name = $("#path_on_switch").val().toString();
  const switch_ip = $("#switch_ip").val().toString();
  // Store input values from this and use them as defaults next time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  last_values
    .make({
      js_compiling_exporting_source_path: source_path,
      js_compiling_exporting_export_name: export_name,
      js_compiling_exporting_switch_ip: switch_ip,
      is_default: false,
    })
    .then(
      () => void 0,
      reason => console.error(reason)
    );
  send(source_path, export_name, switch_ip).then(
    () => void 0,
    reason => console.error(reason)
  );
};
