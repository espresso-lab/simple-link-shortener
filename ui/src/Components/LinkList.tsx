import {
  Table,
  Tooltip,
  Text,
  ActionIcon,
  CopyButton,
  rem,
  Box,
  useMantineTheme,
  Modal,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconCheck,
  IconCopy,
  IconTrash,
  IconZoomIn,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { forwardRef, useEffect, useState } from "react";
import { NewLink } from "./NewLink";
import { notifications } from "@mantine/notifications";
import { deleteLink, fetchLinks } from "../Requests/api";
import ClickList from "./ClickList";
dayjs.extend(localizedFormat);

export interface Link {
  slug: string;
  shortenedUrl: string;
  targetUrl: string;
  createdAt: string;
  updatedAt: string;
  clicks: number;
}

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
    <Table.Tr key={link.slug}>
      <Table.Td visibleFrom="md">
        <Text size="sm">
          {dayjs(link.createdAt).format("DD/MM/YYYY HH:mm")}
        </Text>
      </Table.Td>
      <Table.Td visibleFrom="md">
        <Box display="flex" style={{ alignItems: "center", gap: 3 }}>
          <Tooltip label={link.targetUrl} multiline>
            <Text size="sm" c="dimmed" lineClamp={1}>
              {link.targetUrl}
            </Text>
          </Tooltip>
          <CopyButton value={link.targetUrl} timeout={2000}>
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
          <Box display="flex" style={{ alignItems: "center", gap: 3 }}>
            <Text size="sm">{link.clicks}</Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setSlugDetails(link.slug)}
            >
              <IconZoomIn style={{ width: rem(16) }} />
            </ActionIcon>
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
              {link.shortenedUrl}
            </Box>
            <CopyButton value={link.shortenedUrl} timeout={2000}>
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
                deleteLink(link.slug)
                  .then(() => {
                    refreshLinks();
                    notifications.show({
                      withBorder: true,
                      color: "green",
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

  const [slugDetails, setSlugDetails] = useState<string | undefined>();

  return (
    <>
      {slugDetails && (
        <Modal
          opened={!!slugDetails}
          onClose={() => setSlugDetails(undefined)}
          title={`Clicks for ${slugDetails}`}
        >
          <ClickList slug={slugDetails} />
        </Modal>
      )}

      <NewLink onLinkCreated={() => refreshLinks()} />
      {links.length !== 0 && (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th visibleFrom="md">Created</Table.Th>
              <Table.Th visibleFrom="md">Link</Table.Th>
              <Table.Th>Clicks</Table.Th>
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
