import "@mantine/core/styles.css";
import { Container, MantineProvider } from "@mantine/core";
import { LinkList } from "./Components/LinkList";

export default function App() {
  return (
    <MantineProvider
      theme={{
        primaryColor: "violet",
      }}
    >
      <Container
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <LinkList />
      </Container>
    </MantineProvider>
  );
}
