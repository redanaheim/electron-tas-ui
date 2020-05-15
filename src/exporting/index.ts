import { desktopCapturer } from "electron";
import { IpAddress } from "../ftp";
import { Store } from "../storing";
import { fstat, existsSync } from "fs";
import { basename } from "path";
var path: any = null;
const { dialog, BrowserWindow } = require("electron").remote;
const pick_file = async function (): Promise<string> {
  path = (
    await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ["openFile"],
    })
  ).filePaths[0];
  $("#file_path").val(path || "");
  return path;
};
const send_on_click = async function () {
  const this_window = BrowserWindow.getFocusedWindow();
  let source_path = $("#file_path").val().toString();
  if (existsSync(source_path) === false) {
    await dialog.showMessageBox(this_window, {
      message: "Invalid Source Path",
      details: "The given path does not point to a file.",
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  let export_name = $("#path_on_switch").val().toString();
  let switch_ip = $("#switch_ip").val().toString();
  send(source_path, export_name, switch_ip);
};
const send = async function (
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
  let switch_ip = new IpAddress(ip_text);
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
    await dialog.showMessageBox(this_window, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  if (is_replacing) {
    let should_replace = await dialog.showMessageBox(this_window, {
      message: `This will overwrite /scripts/${export_name} on the Switch. The current file will be backed up, however do you still want to proceed?`,
      type: "question",
      buttons: ["Cancel", "Replace"],
    });
    if (should_replace.response === 0) {
      // User clicked cancel
      return;
    }
  }
  let result;
  try {
    result = await switch_ip.send(path, export_name, 5000);
  } catch (err) {
    await dialog.showMessageBox(this_window, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  dialog.showMessageBox(this_window, {
    message: result.did_succeed
      ? "Sucessfully exported script to Switch."
      : "Export failed.",
    type: "info",
    buttons: ["OK"],
  });
};
module.exports = {
  pick_file: pick_file,
  send: send,
  send_on_click: send_on_click,
};
