import { desktopCapturer } from "electron";
import { IpAddr } from "../ftp";
import { Store } from "../storing";
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
const send = async function (): Promise<void> {
  const this_window = BrowserWindow.getFocusedWindow();
  let ip_text = $("#switch_ip").val().toString();
  let name = $("#path_on_switch").val().toString();

  let switch_ip = new IpAddr(ip_text);
  let is_replacing: boolean;
  try {
    is_replacing = await switch_ip.exists("/scripts/", name, 5000);
  } catch (err) {
    await dialog.showMessageBox(this_window, {
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
    return;
  }
  if (is_replacing) {
    let should_replace = await dialog.showMessageBox(this_window, {
      message: `This will overwrite /scripts/${name} on the Switch. The current file will be backed up, however do you still want to proceed?`,
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
    result = await switch_ip.send(path, name, 5000);
  } catch (err) {
    await dialog.showMessageBox(this_window, {
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
module.exports = { pick_file: pick_file, send: send };
