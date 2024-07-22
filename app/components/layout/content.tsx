import styles from "@/app/components/home/home.module.scss";
import { SlotID } from "@/app/constant";

export const Content = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={styles["window-content"]} id={SlotID.AppBody}>
      {children}
    </div>
  );
};
