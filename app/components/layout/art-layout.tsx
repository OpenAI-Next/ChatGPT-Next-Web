import { Container } from "./container";
import { Content } from "./content";

export const ArtLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Container>
      <Content>{children}</Content>
    </Container>
  );
};
