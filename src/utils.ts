export const rand_string = function (size = 10): string {
  return Math.round(Math.random() * 10 ** Math.round(size)).toString(36);
};

export const error_msg = async function (
  window: any,
  message: string,
  dialog: Electron.Dialog
): Promise<void> {
  await dialog.showMessageBox(window, {
    message: "Invalid IP Address",
    detail: message,
    type: "error",
    buttons: ["OK"],
  });
};
