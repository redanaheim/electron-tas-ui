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
      resizable: false,
    });
    prompt_window.loadFile(join(__dirname, "./index.html"));
    prompt_window.webContents.on(
      "did-finish-load",
      (_e: Electron.Event): void => {
        setTimeout(() => {
          prompt_window.webContents.send("prompts", {
            // send message text to prompt window to update the question
            message: message,
            is_message: true,
          });
        }, 1);
      }
    );
    prompt_window.webContents.on(
      // wait for prompt resolution and resolve the promise with the entered string
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

export const listen_for_prompt_requests = function (
  window: BrowserWindow
): void {
  window.webContents.on(
    "ipc-message",
    async (_e: Electron.Event, channel: string, data: any): Promise<void> => {
      if (channel !== "prompts") return;
      if (data.is_prompt_request) {
        if (data.id) {
          const result = await prompt(
            // create the prompt window and wait for the response
            window,
            data.message || "Enter a string.",
            data.default || void 0
          );
          window.webContents.send("prompts", {
            // send prompt response to original window
            is_prompt_resolution: true,
            result: result,
            id: data.id,
          });
        }
      }
    }
  );
};
