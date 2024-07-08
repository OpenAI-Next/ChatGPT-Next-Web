import locales from "@/app/locales";
import styles from "@/app/components/sd-panel.module.scss";
import { IconButton } from "@/app/components/button";
import React, { useState } from "react";
import {
  ControlParam,
  ControlParamItem,
  getModelParamBasicData,
} from "@/app/components/sd-panel";
import { useIndexedDB } from "react-indexed-db-hook";
import { StoreKey } from "@/app/constant";
import { showToast } from "@/app/components/ui-lib";
import { sendMjTask, useMjStore } from "@/app/store/mj";

const mjCommonParams = (model: string, data: any) => {
  return [
    {
      name: locales.MjPanel.ModelVersion,
      value: "version",
      type: "select",
      default: 0,
      support: ["MID_JOURNEY"],
      options: [
        { name: "V6", value: "6" },
        { name: "V5.2", value: "5.2" },
        { name: "V5.1", value: "5.1" },
        { name: "V5", value: "5" },
      ],
    },
    {
      name: locales.MjPanel.ModelVersion,
      value: "version",
      type: "select",
      default: 0,
      support: ["NIJI_JOURNEY"],
      options: [
        { name: "V6", value: "6" },
        { name: "V5", value: "5" },
        { name: "V4", value: "4" },
      ],
    },
    {
      name: locales.MjPanel.Prompt,
      value: "textPrompt",
      type: "textarea",
      placeholder: locales.MjPanel.PleaseInput(locales.MjPanel.Prompt),
      required: true,
    },
    {
      name: locales.MjPanel.NegativePrompt,
      value: "no",
      type: "textarea",
      placeholder: locales.MjPanel.PleaseInput(locales.MjPanel.NegativePrompt),
    },
    {
      name: locales.MjPanel.AspectRatio,
      value: "aspect",
      type: "select",
      default: "1:1",
      options: [
        { name: "1:1", value: "1:1" },
        { name: "16:9", value: "16:9" },
        { name: "21:9", value: "21:9" },
        { name: "2:3", value: "2:3" },
        { name: "3:2", value: "3:2" },
        { name: "4:5", value: "4:5" },
        { name: "5:4", value: "5:4" },
        { name: "9:16", value: "9:16" },
        { name: "9:21", value: "9:21" },
      ],
    },
    {
      name: locales.MjPanel.Quality,
      value: "quality",
      type: "select",
      default: "1",
      options: [
        { name: "高清", value: "1" },
        { name: "清晰", value: ".5" },
        { name: "普通", value: ".25" },
      ],
    },
    {
      name: locales.MjPanel.Chaos,
      value: "chaos",
      type: "number",
      default: 1,
      min: 1,
      max: 100,
    },
    {
      name: locales.MjPanel.Stylize,
      value: "stylize",
      type: "number",
      default: 100,
      min: 0,
      max: 1000,
    },
    {
      name: "Seed",
      value: "seed",
      type: "number",
      default: 0,
      min: 0,
      max: 4294967294,
    },
  ].filter((item) => {
    return !(item.support && !item.support.includes(model));
  });
};

const models = [
  {
    name: "MidJourney",
    value: "MID_JOURNEY",
    params: (data: any) => mjCommonParams("MID_JOURNEY", data),
  },
  {
    name: "NijiJourney NIJI",
    value: "NIJI_JOURNEY",
    params: (data: any) => mjCommonParams("NIJI_JOURNEY", data),
  },
];

export function MjPanel() {
  const [currentModel, setCurrentModel] = useState(models[0]);
  const [params, setParams] = useState(
    getModelParamBasicData(currentModel.params({}), {}),
  );
  const handleValueChange = (field: string, val: any) => {
    setParams((prevParams: any) => ({
      ...prevParams,
      [field]: val,
    }));
  };
  const handleModelChange = (model: any) => {
    setCurrentModel(model);
    setParams(getModelParamBasicData(model.params({}), params));
  };
  const mjListDb = useIndexedDB(StoreKey.MjList);
  const { execCountInc } = useMjStore();
  const handleSubmit = () => {
    const columns = currentModel.params(params);
    const reqParams: any = {};
    for (let i = 0; i < columns.length; i++) {
      const item = columns[i];
      reqParams[item.value] = params[item.value] ?? null;
      if (item.required) {
        if (!reqParams[item.value]) {
          showToast(locales.MjPanel.ParamIsRequired(item.name));
          return;
        }
      }
    }
    // console.log(JSON.stringify(reqParams, null, 4));
    let data: any = {
      status: "SUBMITTED",
      botType: currentModel.value,
      params: { ...reqParams, botType: currentModel.value },
      img_data: "",
      created_at: new Date().getTime(),
    };
    mjListDb.add(data).then(
      (id) => {
        data = { ...data, id };
        mjListDb.update(data);
        execCountInc();
        sendMjTask(data, mjListDb, execCountInc);
        setParams(getModelParamBasicData(columns, params, true));
      },
      (error) => {
        console.error(error);
        showToast(`error: ` + error.message);
      },
    );
  };

  return (
    <>
      <ControlParamItem title={locales.MjPanel.AIModel}>
        <div className={styles["ai-models"]}>
          {models.map((item) => {
            return (
              <IconButton
                text={item.name}
                key={item.value}
                type={currentModel.value == item.value ? "primary" : null}
                shadow
                onClick={() => handleModelChange(item)}
              />
            );
          })}
        </div>
      </ControlParamItem>
      <ControlParam
        columns={currentModel.params(params) as any[]}
        data={params}
        onChange={handleValueChange}
      />
      <IconButton
        text={locales.MjPanel.Submit}
        type="primary"
        style={{ marginTop: "20px" }}
        shadow
        onClick={handleSubmit}
      />
    </>
  );
}
