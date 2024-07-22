import React, { useRef } from "react";

import styles from "@/app/components/home/home.module.scss";

import { IconButton } from "@/app/components/button";
import SettingsIcon from "@/app/icons/settings.svg";
import GithubIcon from "@/app/icons/github.svg";
import SDIcon from "@/app/icons/sd.svg";
import ReturnIcon from "@/app/icons/return.svg";

import Locale from "@/app/locales";

import { Path, REPO_URL } from "@/app/constant";

import { Link, useNavigate } from "react-router-dom";
import {
  SideBarContainer,
  SideBarBody,
  useDragSideBar,
  useHotKey,
} from "@/app/components/sidebar";

import { SdPanel } from "@/app/components/sd";

export function SDSideBar(props: { className?: string }) {
  useHotKey();
  const sdPanelRef = useRef<{
    handleSubmit: () => void;
  }>(null);
  const { onDragStart, shouldNarrow } = useDragSideBar();
  const navigate = useNavigate();

  // @ts-ignore
  return (
    <SideBarContainer
      onDragStart={onDragStart}
      shouldNarrow={shouldNarrow}
      {...props}
    >
      <div className={styles["sidebar-header"]} data-tauri-drag-region>
        <div className={styles["sidebar-title"]} data-tauri-drag-region>
          <IconButton
            icon={<ReturnIcon />}
            bordered
            title={Locale.Chat.Actions.ChatList}
            onClick={() => navigate(Path.Chat)}
          />
        </div>
        <div className={styles["sidebar-logo"] + " no-dark"}>
          <SDIcon width={44} height={44} />
        </div>
      </div>

      <SideBarBody>
        <SdPanel ref={sdPanelRef} />
      </SideBarBody>
      <div className={styles["sidebar-tail"]}>
        <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"]}>
            <Link to={Path.Settings}>
              <IconButton icon={<SettingsIcon />} shadow />
            </Link>
          </div>
          <div className={styles["sidebar-action"]}>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <IconButton icon={<GithubIcon />} shadow />
            </a>
          </div>
        </div>
        {/* <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"]}>
            <IconButton
              text={Locale.SdPanel.Submit}
              shadow
              type="primary"
              onClick={sdPanelRef.current?.handleSubmit}
            />
          </div>
        </div> */}
      </div>
    </SideBarContainer>
  );
}
