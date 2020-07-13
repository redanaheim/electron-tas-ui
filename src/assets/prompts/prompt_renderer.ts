import { ipcRenderer } from "electron";
import { rand_string } from "../../utils";
export const request_prompt = async function (
  message?: string,
  default_?: string
): Promise<string> {
  const id = rand_string();
  ipcRenderer.send("prompts", {
    is_prompt_request: true,
    id: id,
    message: message || "Enter a string.",
    default: default_ || void 0,
  });
  return new Promise((res, rej) => {
    ipcRenderer.on("prompts", function listener(
      _e: Electron.Event,
      data: any
    ): void {
      if (data.is_prompt_resolution) {
        if (data.id === id) {
          ipcRenderer.removeListener("prompts", listener);
          if (typeof data.result !== "string")
            rej("Invalid data type returned.");
          res(data.result);
        }
      }
    });
  });
};
