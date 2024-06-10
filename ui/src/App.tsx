import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { ColorSchemeScript, Container, MantineProvider } from "@mantine/core";
import { LinkList } from "./Components/LinkList";
import { Notifications } from "@mantine/notifications";

export default function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="auto" />
      <MantineProvider
        defaultColorScheme="auto"
        theme={{
          primaryColor: "violet",
        }}
      >
        <Notifications />
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
    </>
  );
}
