import { app, BrowserWindow, Menu, MenuItem } from "electron";
import * as path from "path";
import { Store } from "./storing";

if (require("electron-squirrel-startup")) {
  app.quit();
}

const create_window = () => {
  const main_window = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  main_window.loadFile(path.join(__dirname, "../src/index.html"));
};

const create_editing_window = () => {
  const main_window = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  //main_window.loadFile(path.join(__dirname, "../src/editing/index.html"));
};

const create_export_window = () => {
  const popup = new BrowserWindow({
    height: 200,
    width: 400,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  popup.loadFile(path.join(__dirname, "../src/exporting/index.html"));
};

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
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.executeJavaScript("set_theme(document);");
  });
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

let menu = Menu.buildFromTemplate([
  {
    label: "Electron TAS UI",
    submenu: [
      {
        label: "About",
      },
    ],
  },
  {
    label: "File",
    submenu: [
      {
        click: create_editing_window,
        label: "New Script",
      },
      {
        click: create_export_window,
        label: "Export Existing Script",
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
      {
        click: (menu_item, browser_window, event) => {
          browser_window.webContents.openDevTools();
        },
        label: "Open Dev Tools",
      },
    ],
  },
]);

Menu.setApplicationMenu(menu);
