var path: any = null;
const { dialog, BrowserWindow } = require("electron").remote;
const pick_file = async function (): Promise<string> {
  path = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ["openFile"],
  });
  $("#file_path").val(path.filePaths[0] || "");
  return path;
};
module.exports = pick_file;
