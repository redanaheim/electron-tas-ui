import { IpAddress } from "../ftp";
import {
  read_file_async,
  write_file_async,
  Store,
  store_defaults,
} from "../storing";
import { compile } from "../assets/compiling/compile";
import { existsSync } from "fs";
import { join } from "path";
let path: any = null;
const { app, dialog, BrowserWindow } = require("electron").remote;
export const on_init = async function (): Promise<void> {
  // Set input values to ones from last time
  const last_values = new Store(
    "last_input_values",
    store_defaults.last_input_values
  );
  const {
    compiling_exporting_source_path,
    compiling_exporting_export_name,
    compiling_exporting_switch_ip,
  } = await last_values.data;
  $("#file_path").val(compiling_exporting_source_path);
  $("#path_on_switch").val(compiling_exporting_export_name);
  $("#switch_ip").val(compiling_exporting_switch_ip);
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
  if (/^[0-9a-zA-Z.]+$/.test(export_name) === false) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Export Name",
      details: "You can only use '.' and alphanumeric characters.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  const switch_ip = new IpAddress(ip_text);
  if (switch_ip.did_succeed === false) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid IP Address",
      details:
        "Switch's IP address can only be 4 numbers between 0 and 255 separated by '.'",
      type: "error",
      buttons: ["OK"],
    });
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
  const file_content = (await read_file_async(source_path, "utf8")).toString();
  // this is the path the compiled file will be stored to,
  // and where we want to get the file from before exporting to switch
  source_path = join(app.getPath("temp"), "compiled.txt");
  try {
    await write_file_async(
      source_path,
      compile(
        file_content,
        await Store.value_of(
          "dialogs",
          "show_compiler_errors",
          store_defaults.dialogs
        )
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
  const show_dialog_selections = await new Store(
    "dialogs",
    store_defaults.dialogs
  );
  if (await show_dialog_selections.get("show_export_success")) {
    const button = await dialog.showMessageBox(this_window, {
      message: result.did_succeed
        ? "Sucessfully exported script to Switch."
        : "Export failed.",
      type: "info",
      buttons: ["OK", "Do not show this again"],
    });
    if (button.response === 1) {
      show_dialog_selections.set("show_export_success", false);
    }
  }
};
export const send_on_click = async function (): Promise<void> {
  const this_window = BrowserWindow.getFocusedWindow();
  const source_path = $("#file_path").val().toString();
  if (existsSync(source_path) === false) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Source Path",
      details: "The given path does not point to a file.",
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
  last_values.make({
    compiling_exporting_source_path: source_path,
    compiling_exporting_export_name: export_name,
    compiling_exporting_switch_ip: switch_ip,
    is_default: false,
  });
  send(source_path, export_name, switch_ip);
};
