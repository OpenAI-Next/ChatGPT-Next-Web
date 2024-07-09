import { copyToClipboard, useMobileScreen } from "@/app/utils";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getClientConfig } from "@/app/config/client";
import { useAppConfig } from "@/app/store";
import { useIndexedDB } from "react-indexed-db-hook";
import { Path, StoreKey } from "@/app/constant";
import { doMjTaskAction, fetchMjTask, useMjStore } from "@/app/store/mj";
import chatStyles from "@/app/components/chat.module.scss";
import { IconButton } from "@/app/components/button";
import ReturnIcon from "@/app/icons/return.svg";
import Locale from "@/app/locales";
import locales from "@/app/locales";
import MinIcon from "@/app/icons/min.svg";
import MaxIcon from "@/app/icons/max.svg";
import styles from "@/app/components/mj.module.scss";
import ErrorIcon from "@/app/icons/delete.svg";
import LoadingIcon from "@/app/icons/three-dots.svg";
import { ChatAction, TextButton } from "@/app/components/chat";
import PromptIcon from "@/app/icons/prompt.svg";
import CopyIcon from "@/app/icons/copy.svg";
import ResetIcon from "@/app/icons/reload.svg";
import DeleteIcon from "@/app/icons/clear.svg";
import { showConfirm } from "@/app/components/ui-lib";
import { Property } from "csstype";
import { MjTaskType } from "@/app/store/sd";

function getMjTaskStatus(item: any, progress: string) {
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
    case "LOADING_ERROR":
      s = Locale.Mj.Status.LoadingError;
      color = "orangered";
      break;
    case "NOT_START":
      s = Locale.Mj.Status.Wait;
      color = "gold";
      break;
    case "SUBMITTED":
      s = Locale.Mj.Status.Submitted;
      color = "gold";
      break;
    case "IN_PROGRESS":
      s = Locale.Mj.Status.Running + "-" + progress;
      color = "blue";
      break;
    default:
      s = item.status?.toUpperCase();
  }
  return (
    <p className={styles["line-1"]} title={item.error} style={{ color: color }}>
      <span>
        {locales.Mj.Status.Name}: {s}
      </span>
      {item.status === "FAILURE" && <span> - {item.error}</span>}
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

  // 对所有非 SUCCESS/FAILURE 的任务进行轮询（即fetchMjTask）
  async function pollMjTask() {
    const tasks = mjImages.filter(
      (item) => item.status !== "SUCCESS" && item.status !== "FAILURE",
    );

    const res = tasks.map((item) =>
      fetchMjTask(item.id, item.taskId, mjListDb, execCountInc),
    );

    await Promise.all(res);
  }

  useEffect(() => {
    mjListDb
      .getAll()
      .then((data: MjTaskType[]) => setMjImages((data || []).reverse()));
  }, [execCount]);

  useEffect(() => {
    const interval = setInterval(async () => {
      await pollMjTask();
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mjImages]);

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
        <div className={styles["mj-img-list"]}>
          {mjImages.length > 0 ? (
            mjImages.map((item) => {
              return (
                <div
                  key={item.id}
                  style={{ display: "flex" }}
                  className={styles["mj-img-item"]}
                >
                  {item.status === "SUCCESS" ? (
                    <img
                      className={styles["img"]}
                      src={item.img_data}
                      alt={`${item.id}`}
                      onClick={() => window.open(item.img_data)}
                      onError={() =>
                        mjListDb.update({ ...item, status: "LOADING_ERROR" })
                      }
                    />
                  ) : item.status === "FAILURE" ||
                    item.status === "LOADING_ERROR" ? (
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
                    className={styles["mj-img-item-info"]}
                  >
                    <p className={styles["line-1"]}>
                      {locales.MjPanel.Prompt}:{" "}
                      <span title={item.params?.textPrompt}>
                        {item.params?.textPrompt}
                      </span>
                    </p>
                    {getMjTaskStatus(item, item.progress)}
                    <p>时间: {new Date(item.created_at).toLocaleString()}</p>
                    <div className={chatStyles["chat-message-actions"]}>
                      <div className={chatStyles["chat-input-actions"]}>
                        <ChatAction
                          text={Locale.Mj.Actions.Buttons}
                          icon={<PromptIcon />}
                          onClick={() => console.log(1)}
                        />
                        <ChatAction
                          text={Locale.Mj.Actions.Copy}
                          icon={<CopyIcon />}
                          onClick={() => copyToClipboard(item.prompt ?? "")}
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
                                () =>
                                  setMjImages(
                                    mjImages.filter((i) => i.id !== item.id),
                                  ),
                                (error) => console.error(error),
                              );
                            }
                          }}
                        />
                      </div>
                      <div style={{ marginTop: "8px" }} />
                      <div
                        className={
                          chatStyles["chat-input-actions-always-show-text"]
                        }
                      >
                        {item.buttons?.map((opt, index: number) => (
                          <TextButton
                            key={index}
                            text={opt.label || opt.emoji}
                            onClick={async () =>
                              await doMjTaskAction(
                                opt.customId,
                                item.taskId,
                                mjListDb,
                                execCountInc,
                              )
                            }
                          />
                        ))}
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
