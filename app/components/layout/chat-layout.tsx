import { SideBar } from "@/app/components/sidebar";
import styles from "@/app/components/home/home.module.scss";
import { useLocation } from "react-router-dom";
import { Path } from "@/app/constant";
import { Container } from "./container";
import { Content } from "./content";

export const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  return (
    <Container>
      <SideBar className={isHome ? styles["sidebar-show"] : ""} />
      <Content>{children}</Content>
    </Container>
  );
};
