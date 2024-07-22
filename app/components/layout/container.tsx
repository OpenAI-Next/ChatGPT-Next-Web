import styles from "@/app/components/home/home.module.scss";
import { getLang } from "@/app/locales";
import { getClientConfig } from "@/app/config/client";
import { useAppConfig } from "@/app/store/config";
import { useMobileScreen } from "@/app/utils";

export const Container = ({ children }: { children: React.ReactNode }) => {
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);
  return (
    <div
      className={
        styles.container +
        ` ${shouldTightBorder ? styles["tight-container"] : styles.container} ${
          getLang() === "ar" ? styles["rtl-screen"] : ""
        }`
      }
    >
      {children}
    </div>
  );
};
