import { app, BrowserWindow, Menu, MenuItem, shell } from "electron";
import * as path from "path";
import { Store } from "./storing";

if (require("electron-squirrel-startup")) {
  app.quit();
}

const create_window = async () => {
  let db = new Store("config", {
    theme: "dark",
    is_default: true,
  });
  let current = await db.get("theme");
  const main_window = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  main_window.loadFile(path.join(__dirname, "../src/index.html"));
};

const create_editing_window = async () => {
  let db = new Store("config", {
    theme: "dark",
    is_default: true,
  });
  let current = await db.get("theme");
  const main_window = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  main_window.loadFile(path.join(__dirname, "../src/editing/index.html"));
};

const create_export_window = async () => {
  let db = new Store("config", {
    theme: "dark",
    is_default: true,
  });
  let current = await db.get("theme");
  const popup = new BrowserWindow({
    height: 150,
    width: 330,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/exporting/index.html"));
};

const create_compile_window = async () => {
  let db = new Store("config", {
    theme: "dark",
    is_default: true,
  });
  let current = await db.get("theme");
  const popup = new BrowserWindow({
    height: 125,
    width: 330,
    resizable: process.platform === "darwin" ? false : true,
    webPreferences: {
      nodeIntegration: true,
    },
    backgroundColor: current === "dark" ? "#121212" : "#FFF",
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, "../src/compiling/index.html"));
};

const create_compile_export_window = async () => {};

const toggle_theme = async () => {
  let db = new Store("config", {
    theme: "dark",
    is_default: true,
  });
  let current = await db.get("theme");
  if (current === "light") {
    db.set("theme", "dark");
  } else {
    db.set("theme", "light");
  }
  // Change theme for all open windows
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.executeJavaScript("set_theme(document);");
  });
};

const open_backups = async () => {
  let path = app.getPath("userData") + "/backups/";
  shell.openItem(path);
};

app.on("ready", create_window);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    create_window();
  }
});

let template: any = [
  {
    label: "File",
    submenu: [
      {
        click: create_editing_window,
        accelerator: "CmdOrCtrl+E",
        label: "New Script",
      },
      {
        click: create_export_window,
        accelerator: "CmdOrCtrl+Shift+E",
        label: "Export Existing Script",
      },
      { type: "separator" },
      {
        click: create_compile_window,
        accelerator: "CmdOrCtrl+M",
        label: "Compile Script",
      },
      {
        click: create_compile_export_window,
        accelerator: "CmdOrCtrl+Shift+M",
        label: "Compile and Export Script",
      },
      { type: "separator" },
      {
        click: open_backups,
        label: "Open Script Backups",
      },
    ],
  },
  {
    label: "View",
    submenu: [
      {
        click: toggle_theme,
        label: "Toggle Theme",
      },
      { type: "separator" },
      {
        click: (menu_item: any, browser_window: any, event: any) => {
          browser_window.webContents.openDevTools();
        },
        accelerator:
          process.platform === "darwin"
            ? "CmdOrCtrl+Option+I"
            : "CmdOrCtrl+Alt+I",
        label: "Open Dev Tools",
      },
    ],
  },
];

if (process.platform === "darwin") {
  template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideothers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
  ].concat(template);
}

let menu = Menu.buildFromTemplate(template);

Menu.setApplicationMenu(menu);
