import { MidjourneyTaskPath } from "@/app/constant";
import { create } from "zustand";
import { showToast } from "@/app/components/ui-lib";
import de from "@/app/locales/de";

interface MidjourneyImagineTaskConfigType {
  botType: "MID_JOURNEY" | "NIJI_JOURNEY";
  version: "6" | "5.2" | "5.1" | "5" | "4";
  textPrompt: string;
  no: string;
  quality: "1" | ".5" | ".25";
  aspect: string;
  style: "raw" | "cute" | "expressive" | "original" | "scenic"; //除了Niji 5（不支持 raw），其他版本都是raw
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
}

interface MidjourneyImagineTaskRequestPayload {
  botType: "MID_JOURNEY" | "NIJI_JOURNEY";
  prompt: string;
  base64Array: string[]; //垫图base64数组
}

interface MidjourneySubmitTaskResponseType {
  code: 1 | 2 | number; // 1-提交成功, 22-排队中, other-错误
  description: string; // 描述
  result: string; // 任务ID
  properties: {
    // 扩展字段
    discordChannelId: string; // 任务提交的discord频道ID
    discordInstanceId: string; // 任务提交的discord实例ID
  };
}

export interface MidjourneyTask {
  id: string;
  createdAt: number;
  taskID: string;
  seed: string;
  action:
    | "IMAGINE"
    | "UPSCALE"
    | "VARIATION"
    | "ZOOM"
    | "PAN"
    | "DESCRIBE"
    | "BLEND"
    | "SHORTEN"
    | "SWAP_FACE"
    | "OUTPAINT"
    | "RICREADER_RETRY";
  prompt: string;
  imageUrl: string;
  progress: string; //	任务进度
  status:
    | "NOT_START"
    | "SUBMITTED"
    | "MODAL"
    | "IN_PROGRESS"
    | "FAILURE"
    | "SUCCESS"
    | "CANCEL";
  failReason: string;
  buttons: MidjourneyRefreshTaskResponseType["buttons"];
}

export type MidjourneyTaskAction = MidjourneyTask["action"];
export type MidjourneyTaskStatus = MidjourneyTask["status"];

export interface MidjourneyRefreshTaskResponseType {
  action: string; // 任务类型
  buttons: {
    // 按钮
    customId: string; // 自定义ID
    emoji: string; // 表情
    label: string; // 标签
    style: number; // 样式
    type: number; // 类型
  }[];
  description: string; // 描述
  failReason: string; // 失败原因
  finishTime: number; // 完成时间
  id: string; // 任务ID
  imageUrl: string; // 图片URL
  progress: string; // 进度
  prompt: string; // 提示
  promptEn: string; // 英文提示
  properties: {
    // 扩展字段
    discordChannelId: string; // 任务提交的discord频道ID
    discordInstanceId: string; // 任务提交的discord实例ID
    finalPrompt: string; // 最终的prompt
    finalZhPrompt: string; // 最终的中文prompt
  };
  startTime: number; // 开始时间
  state: string; // 状态
  status: string; // 状态
  submitTime: number; // 提交时间
}

const initialMidjourneyTaskConfig: MidjourneyImagineTaskConfigType = {
  botType: "MID_JOURNEY",
  version: "6",
  textPrompt: "",
  no: "",
  quality: "1",
  aspect: "1:1",
  style: "raw",
  chaos: 0,
  stop: 100,
  stylize: 100,
  uploadImage: undefined,
  iw: 1,
  seed: 0,
  customParam: false,
  weird: 0,
  tile: false,
  crefImages: undefined,
  cw: 1,
  presetDescription: {
    styleDes: "",
    viewDes: "",
    shotDes: "",
    lightDes: "",
  },
};

type MjStore = {
  execCount: number;
  execCountInc: () => void;
};

export const useMjStore = create<MjStore>()((set) => ({
  execCount: 1,
  execCountInc: () => set((state) => ({ execCount: state.execCount + 1 })),
}));

function getImagineBody(
  config: MidjourneyImagineTaskConfigType,
): MidjourneyImagineTaskRequestPayload {
  const needAdd = (
    configName: keyof MidjourneyImagineTaskConfigType,
    configValue: MidjourneyImagineTaskConfigType[keyof MidjourneyImagineTaskConfigType],
  ): boolean => {
    if (
      configValue === undefined ||
      configValue === null ||
      configValue === ""
    ) {
      return false;
    }
    return configValue !== initialMidjourneyTaskConfig[configName];
  };

  let payload: MidjourneyImagineTaskRequestPayload = {
    botType: config.botType,
    prompt: "",
    base64Array: [],
  };

  let fullPrompt = {
    ImagePrompts: "",
    TextPrompts: "",
    Parameters: "",
  };

  // 0. check config
  if (!config || config.textPrompt === "") {
    console.error("[getImaginePayload] config error: ", config);
    return payload;
  }

  // 1. TextPrompt
  // 1.1 add presetDescription if not empty
  // if (config?.presetDescription) {
  //     (config.presetDescription?.styleDes) && (fullPrompt.TextPrompts += (config.presetDescription.styleDes + ", "));
  //     (config.presetDescription?.viewDes) && (fullPrompt.TextPrompts += (config.presetDescription.viewDes + ", "));
  //     (config.presetDescription?.shotDes) && (fullPrompt.TextPrompts += (config.presetDescription.shotDes + ", "));
  //     (config.presetDescription?.lightDes) && (fullPrompt.TextPrompts += (config.presetDescription.lightDes + ", "));
  // }
  // 1.2 add textPrompt
  fullPrompt.TextPrompts += config.textPrompt + ", ";

  // 2. base64Array
  // 2.1 uploadImage
  if (config.uploadImage && config.uploadImage.length) {
    payload.base64Array = payload.base64Array.concat(
      config.uploadImage.map((item) => item.thumbUrl),
    );
  }
  // 2.2 crefImages（Any regular image prompts must go before --cref.），这里不使用 base64Array，需要使用 URL
  // if (config.crefImages && config.crefImages.length) {
  //     payload.base64Array = payload.base64Array.concat(config.crefImages.map((item) => item.thumbUrl));
  // }
  // 3. Parameters
  if (!config.customParam) {
    // 对比默认配置，如果不同则添加，使用 --[key] [value] 的格式, TextPrompts --ar 1:1 --v 6 --[key] [value]
    // dog  --ar 4:3 --chaos 83 --s 144 --q .5 --tile --tile --v 6 --iw 0.48 --cw 46 --seed 12 --no 车 牛马
    // 3.1 尺寸（aspect/ar）
    needAdd("aspect", config.aspect) &&
      (fullPrompt.Parameters += ` --aspect ${config.aspect}`);
    // 3.2 版本（version/v）
    needAdd("version", config.version) &&
      (fullPrompt.Parameters += ` --version ${config.version}`);
    // 3.3 质量（quality/q）
    needAdd("quality", config.quality) &&
      (fullPrompt.Parameters += ` --quality ${config.quality}`);
    // 3.3 no
    config.no !== "" && (fullPrompt.Parameters += ` --no ${config.no}`);
    // 3.4 混乱程度 （chaos）
    needAdd("chaos", config.chaos) &&
      (fullPrompt.Parameters += ` --chaos ${config.chaos}`);
    // 3.5 风格化程度（stylize/s）
    needAdd("stylize", config.stylize) &&
      (fullPrompt.Parameters += ` --stylize ${config.stylize}`);
    // 3.6 重复（tile：bool类型，如果为true则添加，不对默认值进行判断）
    config.tile && (fullPrompt.Parameters += ` --tile`);
    // 3.7 种子（seed）
    needAdd("seed", config.seed) &&
      (fullPrompt.Parameters += ` --seed ${config.seed}`);
    // 3.8 垫图/风格参考图的权重
    needAdd("uploadImage", config.uploadImage) &&
      (fullPrompt.Parameters += ` --uploadImage ${config.iw}`);
    // 3.9 角色参考图的权重（characterWeight）
    needAdd("crefImages", config.crefImages) &&
      (fullPrompt.Parameters += ` --cw ${config.cw}`);
    // 3.10 奇异化程度（weird）,暂时没有提供作为选项
    // needAdd("weird", config.weird) && (fullPrompt.Parameters += ` --weird ${config.weird}`);
    // 3.9999 cref
    if (config.crefImages && config.crefImages.length) {
      fullPrompt.Parameters += ` --cref ${config.crefImages
        .map((item) => item.url)
        .join(" ")}`;
    }
  }

  payload.prompt = [
    fullPrompt.ImagePrompts,
    fullPrompt.TextPrompts,
    fullPrompt.Parameters,
  ].join(" ");

  return payload;
}

export async function sendMjImagineTask(data: any, db: any, inc: any) {
  const reqBody = getImagineBody(data.params);

  const savedData = {
    id: data.id,
    status: "SUBMITTED",
    prompt: reqBody.prompt,
    progress: "0%",
    params: data.params,
    taskId: "",
    img_data: "",
    error: "",
    created_at: new Date().getTime(),
  };

  fetch(["https://mj.openai-next.com", MidjourneyTaskPath.IMAGINE].join("/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "sk-jUDoGolSJbX7FLOUD13385De07D24f7a84C2Be6f00Dc237a",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(reqBody),
  })
    .then((response) => response.json())
    .then((resData: MidjourneySubmitTaskResponseType) => {
      if (resData.code === 1 || resData.code === 2) {
        db.update({
          ...savedData,
          status: "SUBMITTED",
          taskId: resData.result,
          description: resData.description,
        });
      } else {
        db.update({
          ...savedData,
          status: "FAILURE",
          error: resData.description,
          description: resData.description,
        });
      }
      inc();
    })
    .catch((error) => {
      db.update({
        ...savedData,
        status: "FAILURE",
        error: error.message,
      });
      console.error("Error:", error);
      inc();
    });
}

function getBase64ArrayFromFiles(fileList: FileList): Promise<string[]> {
  const promises: Promise<string>[] = [];
  for (let i = 0; i < fileList.length; i++) {
    promises.push(convertFileToBase64(fileList[i]));
  }
  return Promise.all(promises);
}

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

interface MidjourneyBlendTaskParams {
  id: string;
  status: string;
  params: {
    botType: "MID_JOURNEY" | "NIJI_JOURNEY";
    dimensions: "PORTRAIT" | "SQUARE" | "LANDSCAPE";
    blendImages: FileList;
  };
  created_at: number;
}

export interface MidjourneyBlendTaskRequestPayload {
  botType: "MID_JOURNEY" | "NIJI_JOURNEY";
  base64Array: string[]; // base64数组，最多5张
  dimensions: "PORTRAIT" | "SQUARE" | "LANDSCAPE"; // 图片尺寸，PORTRAIT(2:3); SQUARE(1:1); LANDSCAPE(3:2)
}

export async function sendMjBlendTask(
  data: MidjourneyBlendTaskParams,
  db: any,
  inc: any,
) {
  const base64Array = await getBase64ArrayFromFiles(data.params.blendImages);

  const reqBody: MidjourneyBlendTaskRequestPayload = {
    botType: "MID_JOURNEY",
    base64Array: base64Array,
    dimensions: data.params.dimensions,
  };

  const preData = {
    id: data.id,
    status: "SUBMITTED",
    progress: "0%",
    params: data.params,
    taskId: "",
    img_data: "",
    error: "",
    created_at: new Date().getTime(),
  };

  fetch(["https://mj.openai-next.com", MidjourneyTaskPath.BLEND].join("/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "sk-jUDoGolSJbX7FLOUD13385De07D24f7a84C2Be6f00Dc237a",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(reqBody),
  })
    .then(async (response) => await response.json())
    .then((resData: MidjourneySubmitTaskResponseType) => {
      if (resData.code === 1 || resData.code === 2) {
        db.update({
          ...preData,
          status: "SUBMITTED",
          taskId: resData.result,
          description: resData.description,
        });
      } else {
        db.update({
          ...preData,
          status: "FAILURE",
          error: resData.description,
          description: resData.description,
        });
      }
      inc();
    })
    .catch((error) => {
      db.update({
        ...preData,
        status: "FAILURE",
        error: error.message,
      });
      console.error("Error:", error);
      inc();
    });
}

export async function doMjTaskAction(
  customId: string,
  taskId: string,
  db: any,
  inc: any,
) {
  // insert new record
  let data: any = {
    status: "SUBMITTED",
    created_at: new Date().getTime(),
  };
  db.add(data).then((id: any) => {
    data = { ...data, id };
    db.update(data);
  });
  // fetch action
  fetch(["https://mj.openai-next.com", MidjourneyTaskPath.ACTION].join("/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "sk-jUDoGolSJbX7FLOUD13385De07D24f7a84C2Be6f00Dc237a",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ customId, taskId }),
  })
    .then((response) => response.json())
    .then((resData: MidjourneySubmitTaskResponseType) => {
      db.update({
        ...data,
        status: "SUBMITTED",
        taskId: resData.result,
        description: resData.description,
      });
      inc();
    })
    .catch((error) => {
      db.update({
        ...data,
        status: "FAILURE",
        error: error.message,
      });
      console.error("Error:", error);
      inc();
    });

  showToast("Action submitted");
}

export async function fetchMjTask(
  id: number,
  taskId: string,
  db: any,
  inc: any,
) {
  const originalData = await db.getByID(id).then((data: any) => {
    return data;
  });

  if (!originalData) {
    console.error("Error: task not found");
    inc();
    return;
  }

  if (!taskId && new Date().getTime() - originalData.created_at > 1000 * 20) {
    await db.update({
      ...originalData,
      status: "FAILURE",
      error: "Task ID is empty",
    });
    inc();
    return;
  }

  fetch(
    [
      "https://mj.openai-next.com",
      MidjourneyTaskPath.REFRESH.replace("{id}", taskId),
    ].join("/"),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "sk-jUDoGolSJbX7FLOUD13385De07D24f7a84C2Be6f00Dc237a",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  )
    .then((response) => response.json())
    .then((resData: MidjourneyRefreshTaskResponseType) => {
      debugger;
      db.update({
        ...originalData,
        prompt: resData.prompt === "" ? resData.action : resData.prompt,
        status: resData.status === "" ? "NOT_START" : resData.status,
        img_data: resData.imageUrl,
        progress: resData.progress,
        description: resData.description,
        buttons: resData.buttons ?? [],
        error: resData.failReason,
      });
      inc();
    })
    .catch((error) => {
      db.update({
        ...originalData,
        status: "FAILURE",
        error: error.message,
      });
      console.error("Error:", error);
      inc();
    });
}

//
// {
//     "code": 1,
//     "description": "In queue, there are 3 tasks ahead",
//     "result": "1720192419453837",
//     "properties": {
//     "numberOfQueues": 3,
//         "discordChannelId": "1258300479880826930",
//         "discordInstanceId": "1530234339489083392"
// }
// }
