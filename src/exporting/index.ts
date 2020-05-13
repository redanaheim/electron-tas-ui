var path: string = null;
function pick_file(): string {
  const { dialog } = require("electron").remote;
  path = dialog.showOpenDialog({
    properties: ["openFile"],
  });
  return path;
}
