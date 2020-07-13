import { BrowserWindow } from "electron";
import { join } from "path";
export const prompt = function (
  window: BrowserWindow,
  message: string,
  default_?: string
): Promise<string> {
  return new Promise<string>((res, rej) => {
    const prompt_window = new BrowserWindow({
      width: 350,
      height: 60,
      frame: false,
      parent: window,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
      },
    });
    prompt_window.loadFile(join(__dirname, "./index.html"));
    prompt_window.webContents.on(
      "did-finish-load",
      (_e: Electron.Event): void => {
        setTimeout(() => {
          prompt_window.webContents.send("prompts", {
            message: message,
            is_message: true,
          });
        }, 1);
      }
    );
    prompt_window.webContents.on(
      "ipc-message",
      (event: Electron.Event, channel: string, data: any): void => {
        if (channel !== "prompts") return;
        if (typeof data !== "string") {
          prompt_window.destroy();
          rej("Non-string value sent to prompts channel");
        }
        prompt_window.close();
        res(data || default_);
      }
    );
  });
};
