/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable no-async-promise-executor */
// TODO: Don't use async promise executors
// TODO: Find out why connection sometimes never closes
import * as Client from "ftp";
import { existsSync, mkdirSync, createWriteStream, writeFile } from "fs";
import { app, remote, BrowserWindow } from "electron";
import { sys } from "ping";
import { join } from "path";

const format_time = function (): string {
  const date = new Date();
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    date.getDay()
  ];
  return `${weekday} ${date.getHours()}꞉${date.getMinutes()}꞉${date.getSeconds()}`;
};
interface PathTo<T> {
  path: string;
  internal_data?: T;
}
class Result {
  did_succeed: boolean;
  did_replace: boolean;
  switch_ip: IpAddress;
  old_file?: PathTo<string>;
  constructor(
    did_suceed?: boolean,
    did_replace?: boolean,
    switch_ip?: IpAddress,
    old_file?: PathTo<string>
  ) {
    this.did_succeed = did_suceed;
    this.did_replace = did_replace;
    this.switch_ip = switch_ip;
    this.old_file = old_file;
  }
}
export class IpAddress {
  /**
   * Regular expression to check if a string is a valid dotted-decimal notation IPv4 address
   */
  static regex = /^((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])\.((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])\.((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])\.((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])$/;
  parts: number[];
  did_succeed: boolean;
  error: string;
  static error_from = async function (
    instance: IpAddress,
    window: BrowserWindow
  ): Promise<void> {
    if (instance.did_succeed) return;
    await remote.dialog.showMessageBox(window, {
      message: "Invalid IP Address",
      detail: instance.error,
      type: "error",
      buttons: ["OK"],
    });
  };
  constructor(text: string) {
    const parts = text.split(".").map(x => +x);
    if (
      !parts.some(x => x > 255 || x < 0 || isNaN(x)) &&
      parts.length === 4
    ) {
      this.parts = parts;
      this.did_succeed = true;
    } else {
      this.error =
        "Invalid IP address format. Try 4 numbers between 0 and 255 separated by dots.";
      this.parts = [0];
      this.did_succeed = false;
    }
  }
  /**
   * Checks if the IP address the instance points to is alive.
   */
  is_valid(): Promise<boolean> {
    return new Promise((res, _rej) => {
      sys.probe(this.parts.join("."), (exists: boolean) => {
        res(exists);
        return;
      });
      return false;
    });
  }
  /**
   * Gets the connections object to pass to FTP module.
   * @param port Optional port number, default is 5000 which almost always works for Switches.
   */
  get_connect_obj(port?: number): any {
    return {
      host: this.parts.join("."),
      port: port || 5000,
    };
  }
  /**
   * Backs up a file to local folder
   * @param target_path Path to file on client to back up
   * @param backup_name Filename of the backup, which will be located in app_folder/backups/
   * @param port Port number to connect to with FTP
   * @param connection Optional connection object to use
   * @param connection_ready Optional: is the passed connection object already open?
   */
  async backup(
    target_path: string,
    backup_name: string,
    port: number,
    connection?: Client,
    connection_ready?: boolean
  ): Promise<PathTo<string>> {
    const that = this;
    return new Promise(async (res, rej) => {
      if (!(await that.is_valid())) {
        rej(
          `Ping IP address ${that.parts.join(
            "."
          )} failed (target doesn't exist or is dead).`
        );
      }
      let client: Client;
      if (connection) {
        // have we been passed a connection
        client = connection;
      } else {
        client = new Client();
      }
      const on_ready = function (): void {
        client.get(target_path, (err: any, data: any) => {
          if (err) {
            rej(err);
          }
          let app_path: string;
          // Back up in app directory
          if (app) {
            app_path = app.getPath("userData");
          } else {
            app_path = remote.app.getPath("userData");
          }
          // Make sure backups directory exists
          if (!existsSync(join(app_path, "backups"))) {
            mkdirSync(join(app_path, "backups"));
          }
          // Make file for backup
          writeFile(join(app_path, "backups", backup_name), "", (err: any) => {
            if (err) {
              rej(err);
            }
          });
          // Write old data from Switch to backup file
          try {
            data.pipe(
              createWriteStream(join(app_path, "backups", backup_name))
            );
          } catch (err) {
            rej(err);
          }
          data.once("close", () => {
            res({
              path: join(app_path, "backups", backup_name),
            });
            if (!connection_ready) {
              client.end();
            }
          });
        });
      };
      if (!connection_ready) {
        client.on("ready", on_ready);
      } else {
        on_ready();
      }
      if (!connection) {
        try {
          client.connect(this.get_connect_obj(port));
        } catch (err) {
          rej(err);
        }
      }
    });
  }
  /**
   * Check if a file already exists on the client
   * @param directory Path to the folder the file would be in
   * @param target Filename to check
   * @param port Port number to connect to with FTP
   * @param connection Optional already-open connection object to use
   * @param connection_ready Optional: is the passed connection object already open?
   */
  async exists(
    directory: string,
    target: string,
    port: number,
    connection?: Client,
    connection_ready?: boolean
  ): Promise<boolean> {
    const that = this;
    return new Promise(async (res, rej) => {
      if (!(await that.is_valid())) {
        rej(
          "Ping IP address " +
            that.parts.join(".") +
            " failed (target doesn't exist or is dead)."
        );
      }
      let client: Client;
      if (connection) {
        client = connection;
      } else {
        client = new Client();
      }
      const on_ready = function (): void {
        // list all files in given directory, iterate to see if any match
        client.list(directory, (err: any, dir: any[]) => {
          if (err) {
            rej(err);
            client.end();
          }
          let exists = false;
          dir.forEach((item: any) => {
            if (item.name === target && item.type === "-") exists = true;
          });
          res(exists);
          if (!connection_ready) {
            client.end();
          }
        });
      };
      if (!connection_ready) {
        client.on("ready", on_ready);
      } else {
        on_ready();
      }
      if (!connection) {
        try {
          client.connect(this.get_connect_obj(port));
        } catch (err) {
          rej(err);
        }
      }
    });
  }
  /**
   * Uploads a local script to the client and replaces it if it already exists
   * @param source Path to the local file
   * @param target Filename to upload as (will be in the /scripts/ folder)
   * @param port Port number to connect to with FTP
   */
  async send(source: string, target: string, port: number): Promise<Result> {
    const that = this;
    return new Promise(async (res, rej) => {
      if (!(await that.is_valid())) {
        rej(
          `Ping IP address ${that.parts.join(
            "."
          )} failed (target doesn't exist or is dead).`
        );
      }
      const connection = new Client();
      const target_path = `/scripts/${target}`;

      const on_ready = async function (): Promise<void> {
        const result = new Result(false, false, new IpAddress("0.0.0.0"), {
          path: "null",
        });
        // See if file exists
        try {
          result.did_replace = await that.exists(
            "/scripts/",
            target,
            port,
            connection,
            true
          );
        } catch (err) {
          rej(err);
        }
        if (result.did_replace) {
          try {
            result.old_file = await that.backup(
              target_path,
              target + " " + format_time(),
              port,
              connection,
              true
            );
          } catch (err) {
            rej(err);
          }
        }
        // Backup file we will replace
        connection.put(source, target_path, (err: any) => {
          if (err) {
            rej(err);
            throw err;
          }
          result.did_succeed = true;
          result.switch_ip = that;
          connection.end();
          res(result);
        });
      };
      connection.on("ready", on_ready);
      try {
        connection.connect(that.get_connect_obj(5000));
      } catch (err) {
        rej(err);
      }
    });
  }
}
