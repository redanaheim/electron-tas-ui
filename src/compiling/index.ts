import { read_file_async, write_file_async } from "../storing";
import { fstat, existsSync } from "fs";
import { compile } from "../assets/compile";

//import { basename } from "path";
const { dialog, BrowserWindow } = require("electron").remote;
const pick_file = async function (): Promise<string> {
  let path = (
    await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ["openFile"],
    })
  ).filePaths[0];
  if (path) $("#file_path").val(path);
  return path;
};
const pick_save_path = async function (): Promise<void> {
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
const compile_on_click = async function () {
  const this_window = BrowserWindow.getFocusedWindow();
  let save_path = $("#save_path").val().toString();
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
  dialog.showMessageBox(this_window, {
    message: "Sucessfully saved compiled script.",
    type: "info",
    buttons: ["OK"],
  });
};
module.exports = {
  pick_file: pick_file,
  pick_save_path: pick_save_path,
  compile_on_click: compile_on_click,
};