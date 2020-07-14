import { app, BrowserWindow, Menu, shell, dialog, nativeTheme } from "electron";
import * as path from "path";
import { readdir, unlink, existsSync, mkdirSync } from "fs";
import { Store, store_defaults } from "./storing";
import { listen_for_prompt_requests } from "./assets/prompts/prompt_main";
const is_mac = process.platform === "darwin";

if (require("electron-squirrel-startup")) {
  app.quit();
}

const menu_ids = {
  editing_dependent: [
    "editing_save",
    "editing_save_as",
    "editing_export_as_nx_tas",
    "editing_export_as_tig",
    "editing_export_to_switch",
    "editing_enter_switch_ip",
  ],
};

// https://github.com/electron/electron/issues/18397#
app.allowRendererProcessReuse = true;

const main_window_size = {
  height: 600,
  width: 800,
};
const editing_window_size = {
  height: 900,
  width: 1000,
};
const compiling_window_size = {
  height: is_mac ? 125 : 110,
  width: is_mac ? 330 : 350,
};
const exporting_window_size = {
  height: is_mac ? 150 : 120,
  width: is_mac ? 330 : 430,
};

export const menu_click_handlers: { [key: string]: any } = {};

menu_click_handlers.create_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const main_window = new BrowserWindow({
    height: main_window_size.height,
    width: main_window_size.width,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  main_window.loadFile(path.join(__dirname, "../src/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_help_window = async (
  html_path: string
): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const main_window = new BrowserWindow({
    height: main_window_size.height,
    width: main_window_size.width,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  main_window.loadFile(path.join(__dirname, html_path)).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_editing_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const main_window = new BrowserWindow({
    height: editing_window_size.height,
    width: editing_window_size.width,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  main_window.loadFile(path.join(__dirname, "../src/editing/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
  main_window.on("close", (e: Electron.Event) => {
    if (main_window.isDocumentEdited()) {
      e.preventDefault();
      dialog
        .showMessageBox(main_window, {
          buttons: ["Cancel", "Close", "Save"],
          message:
            "Are you sure you want to close this window? All unsaved data will be lost.",
        })
        .then(
          (response) => {
            if (response.response === 1) main_window.destroy();
            else if (response.response === 2) {
              main_window.webContents.send("requests", "request_save");
            }
          },
          (reason) => console.error(reason)
        );
    }
  });
  main_window.on("focus", () => {
    menu_ids.editing_dependent.forEach((x: string) => {
      Menu.getApplicationMenu().getMenuItemById(x).enabled = true;
    });
  });
  main_window.on("blur", () => {
    menu_ids.editing_dependent.forEach((x: string) => {
      Menu.getApplicationMenu().getMenuItemById(x).enabled = false;
    });
  });
  main_window.webContents.on(
    "ipc-message",
    (_event: Electron.Event, channel: string, data: any) => {
      switch (channel) {
        case "save_events": {
          if (data.is_represented_update) {
            main_window.setRepresentedFilename(data.path);
          } else if (typeof data === "string") {
            switch (data) {
              case "saved": {
                main_window.setDocumentEdited(false);
                break;
              }
              case "unsaved": {
                main_window.setDocumentEdited(true);
                break;
              }
            }
          }
          break;
        }
      }
    }
  );
  listen_for_prompt_requests(main_window);
};

menu_click_handlers.create_export_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: exporting_window_size.height,
    width: exporting_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/exporting/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_compile_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: compiling_window_size.height,
    width: compiling_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/compiling/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_numeric_value_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: 95,
    width: 300,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/numbers/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_decompile_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: compiling_window_size.height,
    width: compiling_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/decompiling/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_preprocessor_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: compiling_window_size.height,
    width: compiling_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/preprocessing/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_js_compile_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: compiling_window_size.height,
    width: compiling_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/js_compiling/index.html")).then(
    () => void 0,
    (reason) => console.error(reason)
  );
};

menu_click_handlers.create_compile_export_window = async (): Promise<void> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: exporting_window_size.height,
    width: exporting_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup
    .loadFile(path.join(__dirname, "../src/compiling_to_switch/index.html"))
    .then(
      () => void 0,
      (reason) => console.error(reason)
    );
};

menu_click_handlers.create_js_compile_export_window = async (): Promise<
  void
> => {
  const current = await Store.value_of(
    "config",
    "theme",
    store_defaults.config
  );
  const popup = new BrowserWindow({
    height: exporting_window_size.height,
    width: exporting_window_size.width,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup
    .loadFile(path.join(__dirname, "../src/js_compiling_to_switch/index.html"))
    .then(
      () => void 0,
      (reason) => console.error(reason)
    );
};

menu_click_handlers.export_active = (
  save?: boolean,
  save_as?: boolean,
  nx_tas?: boolean
): (() => void) => {
  return function (): void {
    BrowserWindow.getFocusedWindow().webContents.send(
      "requests",
      nx_tas
        ? "request_export_nx_tas"
        : save
        ? save_as
          ? "request_save_as"
          : "request_save"
        : "request_export"
    );
  };
};

menu_click_handlers.request_export_to_switch = (): void => {
  BrowserWindow.getFocusedWindow().webContents.send(
    "requests",
    "request_export_to_switch"
  );
};

menu_click_handlers.request_enter_switch_ip = (): void => {
  BrowserWindow.getFocusedWindow().webContents.send(
    "requests",
    "request_enter_ip"
  );
};

menu_click_handlers.toggle_theme = async (): Promise<void> => {
  const db = new Store("config", store_defaults.config);
  const current = await db.get("theme");
  if (current === "light") {
    db.set("theme", "dark").then(
      () => void 0,
      (reason) => console.error(reason)
    );
  } else {
    db.set("theme", "light").then(
      () => void 0,
      (reason) => console.error(reason)
    );
  }
  // Change theme for all open windows
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.executeJavaScript("set_theme(document);").then(
      () => void 0,
      (reason) => console.error(reason)
    );
  });
};

menu_click_handlers.on_os_theme_update = (is_dark: boolean): void => {
  const db = new Store("config", store_defaults.config);
  if (is_dark) {
    db.set("theme", "dark").then(
      () => void 0,
      (reason) => console.error(reason)
    );
  } else {
    db.set("theme", "light").then(
      () => void 0,
      (reason) => console.error(reason)
    );
  }
  // Change theme for all open windows
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.executeJavaScript("set_theme(document);").then(
      () => void 0,
      (reason) => console.error(reason)
    );
  });
};

menu_click_handlers.open_backups = (): void => {
  const folder = path.join(app.getPath("userData"), "backups");
  if (!existsSync(folder)) {
    mkdirSync(folder);
  }
  shell.openItem(folder);
};

menu_click_handlers.clear_backups = async (): Promise<void> => {
  const folder = path.join(app.getPath("userData"), "backups");
  const response = await dialog.showMessageBox(null, {
    title: "Confirm",
    message: "Really delete all script backups? This cannot be undone.",
    type: "warning",
    buttons: ["Cancel", "Delete"],
  });
  if (response.response === 0) {
    return;
  } else {
    readdir(folder, (err, list) => {
      if (err) throw err;

      for (const backup of list) {
        unlink(path.join(folder, backup), (err) => {
          if (err) throw err;
        });
      }
    });
    dialog
      .showMessageBox({
        title: "Success",
        message: "All backups have been deleted.",
        type: "info",
        buttons: ["OK"],
      })
      .then(
        () => void 0,
        (reason) => console.error(reason)
      );
  }
};

menu_click_handlers.show_compiler_errors = async function (
  do_show: boolean
): Promise<void> {
  const show_dialog_selections = new Store("dialogs", store_defaults.dialogs);
  try {
    await show_dialog_selections.set("show_compiler_errors", do_show);
  } catch (err) {
    console.error(err);
    await dialog.showMessageBox(null, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
  }
};

menu_click_handlers.show_decompiler_errors = async function (
  do_show: boolean
): Promise<void> {
  const show_dialog_selections = new Store("dialogs", store_defaults.dialogs);
  try {
    await show_dialog_selections.set("show_decompiler_errors", do_show);
  } catch (err) {
    console.error(err);
    await dialog.showMessageBox(null, {
      title: "Error",
      message: err.toString(),
      type: "error",
      buttons: ["OK"],
    });
  }
};

// App events

app.on("ready", menu_click_handlers.create_window);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    menu_click_handlers.create_window();
  }
});

// Menu items
import { create_menu } from "./menu";

create_menu().then(
  (value: Menu) => {
    Menu.setApplicationMenu(value);
  },
  (reason) => console.error(reason)
);

// Theme change handling

nativeTheme.on("updated", () => {
  menu_click_handlers.on_os_theme_update(nativeTheme.shouldUseDarkColors);
});
