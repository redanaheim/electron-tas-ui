import { ipcRenderer } from "electron";
export const on_init = function (): void {
  ipcRenderer.on("prompts", (_event: Electron.IpcRendererEvent, data: any) => {
    if (data.is_message) {
      document.getElementById("message").innerHTML =
        data.message || "Enter a string.";
    }
  });
  document.getElementById("cancel").onclick = function (): void {
    ipcRenderer.send("prompts", "cancel");
  };
  document.getElementById("confirm").onclick = function (): void {
    setTimeout(() => {
      ipcRenderer.send(
        "prompts",
        (document.getElementById("input") as HTMLInputElement).value
      );
    }, 200);
  };
};
