const Client = require("ftp");
const fs = require("fs");
const electron = require("electron");
const ping = require("ping");
import { join } from "path";
const format_time = function (): string {
  let date = new Date();
  let weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
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
  static regex = /^((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])\.((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])\.((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])\.((([0-2][0-5]?[0-5]?|[0-1][0-9]?[0-9]?)|[0-9][0-9])|[0-9])$/;
  parts: number[];
  did_succeed: boolean;
  error: string;
  constructor(text: string) {
    if (IpAddress.regex.test(text)) {
      this.parts = text.split(".").map((x) => Number(x));
    } else {
      this.error =
        "Invalid IP address format. Try 4 numbers between 0 and 255 separated by dots.";
      this.parts = [0];
      this.did_succeed = false;
    }
  }
  is_valid(port?: number): Promise<boolean> {
    return new Promise((res, rej) => {
      ping.sys.probe(this.parts.join("."), (exists: boolean) => {
        res(exists);
        return;
      });
      return false;
    });
  }
  get_connnect_obj(port?: number): any {
    return {
      host: this.parts.join("."),
      port: port || 5000,
    };
  }
  async backup(
    target_path: string,
    backup_name: string,
    port: number,
    connection?: any,
    connection_ready?: boolean
  ): Promise<PathTo<string>> {
    let that = this;
    return new Promise(async (res, rej) => {
      if ((await that.is_valid()) === false) {
        rej(
          "Ping IP address " +
            that.parts.join(".") +
            " failed (target doesn't exist or is dead)."
        );
        throw new Error(
          "Ping IP address " +
            that.parts.join(".") +
            " failed (target doesn't exist or is dead)."
        );
      }
      if (connection) {
        var client = connection;
      } else {
        var client = new Client();
      }
      let on_ready = function () {
        let result: PathTo<string>;
        client.get(target_path, (err: any, data: any) => {
          if (err) {
            rej(err);
            throw err;
          }
          let app_path: string;
          if (electron.app) {
            app_path = electron.app.getPath("userData");
          } else {
            app_path = electron.remote.app.getPath("userData");
          }
          // Make sure backups directory exists
          if (fs.existsSync(join(app_path, "backups")) === false) {
            fs.mkdirSync(join(app_path, "backups"));
          }
          // Make file for backup
          fs.writeFile(
            join(app_path, "backups", backup_name),
            "",
            (err: any) => {
              if (err) {
                rej(err);
                throw err;
              }
            }
          );
          // Write old data from Switch to backup file
          try {
            data.pipe(
              fs.createWriteStream(join(app_path, "backups", backup_name))
            );
          } catch (err) {
            rej(err);
            throw err;
          }
          data.once("close", () => {
            res({
              path: join(app_path, "backups", backup_name),
            });
            if (connection_ready === false) {
              client.end();
            }
          });
        });
      };
      if (connection_ready === false) {
        client.on("ready", on_ready);
      } else {
        on_ready();
      }
      if (!connection) {
        try {
          client.connect(this.get_connnect_obj(port));
        } catch (err) {
          rej(err);
          throw err;
        }
      }
    });
  }
  async exists(
    directory: string,
    target: string,
    port: number,
    connection?: any,
    connection_ready?: boolean
  ): Promise<boolean> {
    let that = this;
    return new Promise(async (res, rej) => {
      if ((await that.is_valid()) === false) {
        rej(
          "Ping IP address " +
            that.parts.join(".") +
            " failed (target doesn't exist or is dead)."
        );
        throw new Error(
          "Ping IP address " +
            that.parts.join(".") +
            " failed (target doesn't exist or is dead)."
        );
      }
      if (connection) {
        var client = connection;
      } else {
        var client = new Client();
      }
      let on_ready = function () {
        let result: Result;
        client.list(directory, (err: any, dir: any[]) => {
          if (err) {
            rej(err);
            client.end();
            throw err;
          }
          let exists = false;
          dir.forEach((item: any) => {
            if (item.name === target && item.type === "-") exists = true;
          });
          res(exists);
          if (connection_ready === false) {
            client.end();
          }
        });
      };
      if (connection_ready === false) {
        client.on("ready", on_ready);
      } else {
        on_ready();
      }
      if (!connection) {
        try {
          client.connect(this.get_connnect_obj(port));
        } catch (err) {
          rej(err);
          throw err;
        }
      }
    });
  }
  async send(source: string, target: string, port: number): Promise<Result> {
    let that = this;
    return new Promise(async (res, rej) => {
      if ((await that.is_valid()) === false) {
        rej(
          "Ping IP address " +
            that.parts.join(".") +
            " failed (target doesn't exist or is dead)."
        );
      }
      let connection = new Client();
      let target_path = `/scripts/${target}`;

      let on_ready = async function () {
        let result = new Result(false, false, new IpAddress("0.0.0.0"), {
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
          throw err;
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
            throw err;
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
        connection.connect(that.get_connnect_obj(5000));
      } catch (err) {
        rej(err);
        throw err;
      }
    });
  }
}
