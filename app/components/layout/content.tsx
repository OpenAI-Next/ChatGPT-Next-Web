import styles from "@/app/components/home.module.scss";
import { SlotID } from "@/app/constant";

export const Content = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={styles["window-content"]} id={SlotID.AppBody}>
      {children}
    </div>
  );
};
