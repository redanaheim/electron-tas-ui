import { app, remote } from "electron";
import { readFile, writeFile } from "fs";
import { join } from "path";

interface InternalData {
  [key: string]: any;
  is_default: boolean;
}

export const read_file_async = async function (
  path: string,
  encoding: string
): Promise<string | Buffer> {
  return new Promise((res, rej) => {
    readFile(path, encoding, (err: any, data: any) => {
      if (err) rej(err);
      else res(data);
    });
  });
};
export const write_file_async = async function (
  path: string,
  data: string
): Promise<any> {
  return new Promise((res, rej) => {
    writeFile(path, data, (err: any) => {
      if (err) rej(err);
      else res(true);
    });
  });
};

async function get_data(
  path: string,
  def: InternalData
): Promise<InternalData> {
  let data: any;
  try {
    data = await read_file_async(path, "utf8");
  } catch (err) {
    def.is_default = true;
    return def;
  }
  data = JSON.parse(data);
  data.is_default = false;
  return data;
}

export class Store {
  path: string;
  data: Promise<InternalData>;
  constructor(filename: string, defaults: InternalData) {
    if (app) {
      const storing_path = app.getPath("userData");
      this.path = join(storing_path, filename + ".json");
    } else {
      const storing_path = remote.app.getPath("userData");
      this.path = join(storing_path, filename + ".json");
    }
    this.data = get_data(this.path, defaults);
  }
  async get(property: keyof InternalData): Promise<any> {
    return (await this.data)[property];
  }
  async set(property: any, value: any): Promise<any> {
    let data: InternalData;
    try {
      data = await this.data;
    } catch (err) {
      return err;
    }
    data[property] = value;
    let res: any;
    try {
      res = await write_file_async(this.path, JSON.stringify(data));
    } catch (err) {
      return err;
    }
    return res;
  }
  async make(obj: InternalData): Promise<any> {
    let data: InternalData;
    try {
      data = await this.data;
    } catch (err) {
      return err;
    }
    // Set each property from the object given
    for (let i = 0; i < Object.keys(obj).length; i++) {
      data[Object.keys(obj)[i]] = obj[Object.keys(obj)[i]];
    }
    let res: any;
    try {
      res = await write_file_async(this.path, JSON.stringify(data));
    } catch (err) {
      return err;
    }
    return res;
  }
}
