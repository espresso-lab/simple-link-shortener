import {
  Table,
  Tooltip,
  Text,
  ActionIcon,
  CopyButton,
  rem,
  Box,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconCheck, IconCopy, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { forwardRef, useEffect, useState } from "react";
import { NewLink } from "./NewLink";
import { notifications } from "@mantine/notifications";
import { fetchLinks } from "../Requests/api";
dayjs.extend(localizedFormat);

export interface Link {
  id: string;
  slug: string;
  url: string;
  created_at: string;
  updated_at: string;
}

const hostname =
  location.hostname === "localhost" ? "http://localhost:3000" : "";

export const LinkList = forwardRef(function LinkList() {
  const [links, setLinks] = useState<Link[]>([]);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);

  function refreshLinks() {
    fetchLinks().then((links) => setLinks(links));
  }

  useEffect(() => {
    refreshLinks();
  }, []);

  const rows = links.map((link) => (
    <Table.Tr key={link.id}>
      <Table.Td>
        <Text size="sm">
          {dayjs(link.created_at).format("DD/MM/YYYY HH:mm")}
        </Text>
      </Table.Td>
      <Table.Td visibleFrom="md">
        <Box display="flex" style={{ alignItems: "center", gap: 3 }}>
          <Tooltip label={link.url} multiline>
            <Text size="sm" c="dimmed" lineClamp={1}>
              {link.url}
            </Text>
          </Tooltip>
          <CopyButton value={link.url} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip
                label={copied ? "Copied" : "Copy"}
                withArrow
                position="right"
              >
                <ActionIcon
                  color={copied ? "teal" : "gray"}
                  variant="subtle"
                  onClick={copy}
                >
                  {copied ? (
                    <IconCheck style={{ width: rem(16) }} />
                  ) : (
                    <IconCopy style={{ width: rem(16) }} />
                  )}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Box>
      </Table.Td>
      <Table.Td>
        <Box
          display="flex"
          style={{
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" style={{ alignItems: "center" }}>
            <Box display="flex" style={{ alignItems: "center" }}>
              <Text size="sm" c="dimmed" visibleFrom="md">
                {document.location.toString()}
              </Text>
              {link.slug}
            </Box>
            <CopyButton
              value={`${document.location}${link.slug}`}
              timeout={2000}
            >
              {({ copied, copy }) => (
                <Tooltip
                  label={copied ? "Copied" : "Copy"}
                  withArrow
                  position="right"
                >
                  <ActionIcon
                    color={copied ? "teal" : "gray"}
                    variant="subtle"
                    onClick={copy}
                  >
                    {copied ? (
                      <IconCheck style={{ width: rem(16) }} />
                    ) : (
                      <IconCopy style={{ width: rem(16) }} />
                    )}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Box>
          <ActionIcon.Group>
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              aria-label="Delete"
              onClick={() => {
                fetch(`${hostname}/links/${link.id}`, {
                  method: "DELETE",
                })
                  .then(() => {
                    refreshLinks();
                    notifications.show({
                      withBorder: true,
                      color: "red",
                      title: "Link deleted successfully",
                      message: `Link with slug ${link.slug} has been deleted.`,
                    });
                  })
                  .catch((error) => {
                    notifications.show({
                      withBorder: true,
                      color: "red",
                      title: "Failed to delete link",
                      message: error.message,
                    });
                  });
              }}
            >
              <IconTrash style={{ width: rem(20) }} stroke={1.5} />
            </ActionIcon>
          </ActionIcon.Group>
        </Box>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <NewLink
        onLinkCreated={() => fetchLinks().then((links) => setLinks(links))}
      />
      {links.length !== 0 && (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Created</Table.Th>
              <Table.Th visibleFrom="md">Link</Table.Th>
              <Table.Th>
                <Box
                  display="flex"
                  style={{
                    alignItems: "center",
                    justifyContent: isMobile ? "flex-end" : "flex-start",
                  }}
                >
                  Slug
                </Box>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      )}
    </>
  );
});
