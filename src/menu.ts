import { app, BrowserWindow, Menu, MenuItem } from "electron";
import { menu_click_handlers } from "./main";
import { Store, store_defaults } from "./storing";
export async function create_menu(): Promise<Menu> {
  let template: any = [
    {
      label: "File",
      submenu: [
        {
          click: menu_click_handlers.create_editing_window,
          accelerator: "CmdOrCtrl+E",
          label: "New Script",
        },
        {
          click: menu_click_handlers.create_export_window,
          accelerator: "CmdOrCtrl+Shift+E",
          label: "Export Existing Script",
        },
        { type: "separator" },
        {
          click: menu_click_handlers.create_compile_window,
          accelerator: "CmdOrCtrl+M",
          label: "Compile Script",
        },
        {
          click: menu_click_handlers.create_compile_export_window,
          accelerator: "CmdOrCtrl+Shift+M",
          label: "Compile and Export Script",
        },
        { type: "separator" },
        {
          click: menu_click_handlers.create_js_compile_window,
          accelerator: "CmdOrCtrl+J",
          label: "Compile JavaScript to TAS Script",
        },
        {
          click: menu_click_handlers.create_js_compile_export_window,
          accelerator: "CmdOrCtrl+Shift+J",
          label: "Compile JavaScript to TAS Script and Export",
        },
        { type: "separator" },
        {
          click: menu_click_handlers.open_backups,
          label: "Open Script Backups",
        },
        {
          click: menu_click_handlers.clear_backups,
          label: "Delete All Script Backups",
        },
      ],
    },
    {
      label: "Options",
      submenu: [
        {
          label: "Compiling",
          submenu: [
            {
              click: (
                menu_item: MenuItem,
                _browser_window: BrowserWindow,
                _event: Event
              ): Promise<void> => {
                menu_click_handlers.show_compiler_errors(menu_item.checked);
                return;
              },
              label: "Show Compiler Errors",
              type: "checkbox",
              checked: await Store.value_of(
                "dialogs",
                "show_compiler_errors",
                store_defaults.dialogs
              ),
            },
            {
              click: (
                menu_item: MenuItem,
                _browser_window: BrowserWindow,
                _event: Event
              ): Promise<void> => {
                const dialogs = new Store("dialogs", store_defaults.dialogs);
                dialogs.set("show_compile_success", menu_item.checked);
                return;
              },
              label: "Show Compile Success",
              type: "checkbox",
              checked: await Store.value_of(
                "dialogs",
                "show_compile_success",
                store_defaults.dialogs
              ),
            },
          ],
        },
        {
          label: "Exporting",
          submenu: [
            {
              click: (
                menu_item: MenuItem,
                _browser_window: BrowserWindow,
                _event: Event
              ): Promise<void> => {
                const dialogs = new Store("dialogs", store_defaults.dialogs);
                dialogs.set("show_export_success", menu_item.checked);
                return;
              },
              label: "Show Export Success",
              type: "checkbox",
              checked: await Store.value_of(
                "dialogs",
                "show_export_success",
                store_defaults.dialogs
              ),
            },
          ],
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          click: menu_click_handlers.toggle_theme,
          label: "Toggle Theme",
        },
        { type: "separator" },
        {
          click: (
            _menu_item: MenuItem,
            browser_window: BrowserWindow,
            _event: Event
          ): void => {
            browser_window.reload();
          },
          accelerator: "CmdOrCtrl+R",
          label: "Reload Window",
        },
        {
          click: (
            _menu_item: MenuItem,
            browser_window: BrowserWindow,
            _event: Event
          ): void => {
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
    {
      label: "Help",
      submenu: [
        {
          label: "Better Scripts Help",
          click: (
            _menu_item: MenuItem,
            _browser_window: BrowserWindow,
            _event: Event
          ): void => {
            menu_click_handlers.create_help_window(
              "../src/help/better_scripts/index.html"
            );
          },
        },
        {
          label: "Programmatic Scripts Help",
          click: (
            _menu_item: MenuItem,
            _browser_window: BrowserWindow,
            _event: Event
          ): void => {
            menu_click_handlers.create_help_window(
              "../src/help/programmatic/index.html"
            );
          },
        },
        {
          label: "Exporting Help",
          click: (
            _menu_item: MenuItem,
            _browser_window: BrowserWindow,
            _event: Event
          ): void => {
            menu_click_handlers.create_help_window(
              "../src/help/exporting/index.html"
            );
          },
        },
      ],
    },
  ];

  // Change menu if we're on Mac by adding normal menu categories
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
    ]
      .concat(template)
      .concat([
        {
          label: "Window",
          submenu: [
            { role: "minimize" },
            { role: "zoom" },
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ],
        },
      ]);
  }

  return Menu.buildFromTemplate(template);
}
