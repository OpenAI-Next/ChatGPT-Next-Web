import {
  copyToClipboard,
  getMessageTextContent,
  useMobileScreen,
} from "@/app/utils";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getClientConfig } from "@/app/config/client";
import { useAppConfig } from "@/app/store";
import { useIndexedDB } from "react-indexed-db-hook";
import { Path, StoreKey } from "@/app/constant";
import { fetchMjTask, useMjStore } from "@/app/store/mj";
import chatStyles from "@/app/components/chat.module.scss";
import { IconButton } from "@/app/components/button";
import ReturnIcon from "@/app/icons/return.svg";
import Locale from "@/app/locales";
import locales from "@/app/locales";
import MinIcon from "@/app/icons/min.svg";
import MaxIcon from "@/app/icons/max.svg";
import styles from "@/app/components/sd.module.scss";
import ErrorIcon from "@/app/icons/delete.svg";
import LoadingIcon from "@/app/icons/three-dots.svg";
import { ChatAction } from "@/app/components/chat";
import PromptIcon from "@/app/icons/prompt.svg";
import CopyIcon from "@/app/icons/copy.svg";
import ResetIcon from "@/app/icons/reload.svg";
import DeleteIcon from "@/app/icons/clear.svg";
import { showConfirm } from "@/app/components/ui-lib";
import { Property } from "csstype";
import { MjTaskType } from "@/app/store/sd";

function openBase64ImgUrl(base64Data: string, contentType: string) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl);
}

function getSdTaskStatus(item: any, progress: string) {
  let s: string;
  let color: Property.Color | undefined = undefined;
  switch (item.status) {
    case "SUCCESS":
      s = Locale.Mj.Status.Success;
      color = "green";
      break;
    case "error":
    case "FAILURE":
      s = Locale.Mj.Status.Error;
      color = "red";
      break;
    case "NOT_START":
      s = Locale.Mj.Status.Wait;
      color = "gold";
      break;
    case "IN_PROGRESS":
      s = Locale.Mj.Status.Running + "-" + progress;
      color = "blue";
      break;
    default:
      s = item.status.toUpperCase();
  }
  return (
    <p className={styles["line-1"]} title={item.error} style={{ color: color }}>
      <span>
        {locales.Mj.Status.Name}: {s}
      </span>
      {item.status === "error" && <span> - {item.error}</span>}
    </p>
  );
}

export function Mj() {
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const clientConfig = useMemo(() => getClientConfig(), []);
  const showMaxIcon = !isMobileScreen && !clientConfig?.isApp;
  const config = useAppConfig();
  const scrollRef = useRef<HTMLDivElement>(null);
  const mjListDb = useIndexedDB(StoreKey.MjList);
  const [mjImages, setMjImages] = useState<MjTaskType[]>([]);
  const { execCount } = useMjStore();
  const { execCountInc } = useMjStore();

  useEffect(() => {
    mjListDb.getAll().then((data: MjTaskType[]) => {
      setMjImages((data || []).reverse());
    });
  }, [execCount]);

  return (
    <div className={chatStyles.chat} key={"1"}>
      <div className="window-header" data-tauri-drag-region>
        {isMobileScreen && (
          <div className="window-actions">
            <div className={"window-action-button"}>
              <IconButton
                icon={<ReturnIcon />}
                bordered
                title={Locale.Chat.Actions.ChatList}
                onClick={() => navigate(Path.MjPanel)}
              />
            </div>
          </div>
        )}
        <div className={`window-header-title ${chatStyles["chat-body-title"]}`}>
          <div className={`window-header-main-title`}>Midjourney</div>
          <div className="window-header-sub-title">
            {Locale.Mj.SubTitle(mjImages.length || 0)}
          </div>
        </div>

        <div className="window-actions">
          {showMaxIcon && (
            <div className="window-action-button">
              <IconButton
                icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                bordered
                onClick={() => {
                  config.update(
                    (config) => (config.tightBorder = !config.tightBorder),
                  );
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div className={chatStyles["chat-body"]} ref={scrollRef}>
        <div className={styles["sd-img-list"]}>
          {mjImages.length > 0 ? (
            mjImages.map((item) => {
              return (
                <div
                  key={item.id}
                  style={{ display: "flex" }}
                  className={styles["sd-img-item"]}
                >
                  {item.status === "SUCCESS" ? (
                    <img
                      className={styles["img"]}
                      // src={`data:image/png;base64,${item.img_data}`}
                      src={item.img_data}
                      alt={`${item.id}`}
                      onClick={(e) => {
                        window.open(item.img_data);
                      }}
                      // onClick={(e) => {
                      //     openBase64ImgUrl(item.img_data, "image/png");
                      // }}
                    />
                  ) : item.status === "FAILURE" ? (
                    <div className={styles["pre-img"]}>
                      <ErrorIcon />
                    </div>
                  ) : (
                    <div className={styles["pre-img"]}>
                      <LoadingIcon />
                    </div>
                  )}
                  <div
                    style={{ marginLeft: "10px" }}
                    className={styles["sd-img-item-info"]}
                  >
                    <p className={styles["line-1"]}>
                      {locales.MjPanel.Prompt}:{" "}
                      <span title={item.params?.textPrompt}>
                        {item.params?.textPrompt}
                      </span>
                    </p>
                    <p>
                      {locales.MjPanel.AIModel}: {item?.botType}
                    </p>
                    {getSdTaskStatus(item, item.progress)}
                    <p>{item.created_at}</p>
                    <div className={chatStyles["chat-message-actions"]}>
                      <div className={chatStyles["chat-input-actions"]}>
                        <ChatAction
                          text={Locale.Mj.Actions.Params}
                          icon={<PromptIcon />}
                          onClick={() => console.log(1)}
                        />
                        <ChatAction
                          text={Locale.Mj.Actions.Copy}
                          icon={<CopyIcon />}
                          onClick={() =>
                            copyToClipboard(
                              getMessageTextContent({
                                role: "user",
                                content: item.prompt ?? "",
                              }),
                            )
                          }
                        />
                        <ChatAction
                          text={Locale.Mj.Actions.Retry}
                          icon={<ResetIcon />}
                          onClick={async () =>
                            fetchMjTask(
                              item.id,
                              item.taskId,
                              mjListDb,
                              execCountInc,
                            )
                          }
                        />
                        <ChatAction
                          text={Locale.Mj.Actions.Delete}
                          icon={<DeleteIcon />}
                          onClick={async () => {
                            if (await showConfirm(Locale.Mj.Danger.Delete)) {
                              mjListDb.deleteRecord(item.id).then(
                                () => {
                                  setMjImages(
                                    mjImages.filter(
                                      (i: any) => i.id !== item.id,
                                    ),
                                  );
                                },
                                (error) => {
                                  console.error(error);
                                },
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div>{locales.Mj.EmptyRecord}</div>
          )}
        </div>
      </div>
    </div>
  );
}
