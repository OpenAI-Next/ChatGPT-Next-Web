import { initDB } from "react-indexed-db-hook";
import { StoreKey } from "@/app/constant";
import { create } from "zustand";

export interface MjTaskType {
  id: number;
  status: string;
  botType: string;
  prompt: string;
  progress: string;
  description: string;
  params: {
    version: string;
    textPrompt: string;
    no: string;
    quality: string;
    aspect: string;
    style: string;
    chaos: number;
    stop: number;
    stylize: number;
    uploadImage: any[] | undefined;
    iw: number;
    seed: number | undefined;
    customParam: boolean;
    weird: number;
    tile: boolean;
    crefImages: any[] | undefined;
    cw: number;
    presetDescription?: {
      styleDes: string;
      viewDes: string;
      shotDes: string;
      lightDes: string;
    };
  };
  taskId: string;
  img_data: string;
  buttons: {
    // 按钮
    customId: string; // 自定义ID
    emoji: string; // 表情
    label: string; // 标签
    style: number; // 样式
    type: number; // 类型
  }[];
  error: string;
  created_at: string;
}

export const DbConfig = {
  name: "@chatgpt-next-web/draw",
  version: 1,
  objectStoresMeta: [
    {
      store: StoreKey.SdList,
      storeConfig: { keyPath: "id", autoIncrement: true },
      storeSchema: [
        { name: "model", keypath: "model", options: { unique: false } },
        {
          name: "model_name",
          keypath: "model_name",
          options: { unique: false },
        },
        { name: "status", keypath: "status", options: { unique: false } },
        { name: "params", keypath: "params", options: { unique: false } },
        { name: "img_data", keypath: "img_data", options: { unique: false } },
        { name: "error", keypath: "error", options: { unique: false } },
        {
          name: "created_at",
          keypath: "created_at",
          options: { unique: false },
        },
      ],
    },
    {
      store: StoreKey.MjList,
      storeConfig: { keyPath: "id", autoIncrement: true },
      storeSchema: [
        { name: "status", keypath: "status", options: { unique: false } },
        {
          name: "description",
          keypath: "description",
          options: { unique: false },
        },
        { name: "botType", keypath: "botType", options: { unique: false } },
        { name: "prompt", keypath: "prompt", options: { unique: false } },
        { name: "progress", keypath: "progress", options: { unique: false } },
        { name: "params", keypath: "params", options: { unique: false } },
        { name: "taskId", keypath: "taskId", options: { unique: false } },
        { name: "img_data", keypath: "img_data", options: { unique: false } },
        { name: "buttons", keypath: "buttons", options: { unique: false } },
        { name: "error", keypath: "error", options: { unique: false } },
        {
          name: "created_at",
          keypath: "created_at",
          options: { unique: false },
        },
      ],
    },
  ],
};

export function DrawDbInit() {
  initDB(DbConfig);
}

type SdStore = {
  execCount: number;
  execCountInc: () => void;
};

export const useSdStore = create<SdStore>()((set) => ({
  execCount: 1,
  execCountInc: () => set((state) => ({ execCount: state.execCount + 1 })),
}));

export function sendSdTask(data: any, db: any, inc: any) {
  const formData = new FormData();
  for (let paramsKey in data.params) {
    formData.append(paramsKey, data.params[paramsKey]);
  }
  fetch("https://api.stability.ai/v2beta/stable-image/generate/" + data.model, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((resData) => {
      if (resData.errors && resData.errors.length > 0) {
        db.update({ ...data, status: "error", error: resData.errors[0] });
        inc();
        return;
      }
      if (resData.finish_reason === "SUCCESS") {
        db.update({ ...data, status: "success", img_data: resData.image });
      } else {
        db.update({ ...data, status: "error", error: JSON.stringify(resData) });
      }
      inc();
    })
    .catch((error) => {
      db.update({ ...data, status: "error", error: error.message });
      console.error("Error:", error);
      inc();
    });
}
