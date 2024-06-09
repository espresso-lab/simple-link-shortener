import {
  TextInput,
  TextInputProps,
  ActionIcon,
  useMantineTheme,
  rem,
} from "@mantine/core";
import { useForm, isNotEmpty } from "@mantine/form";
import { IconArrowRight, IconLink, IconTag } from "@tabler/icons-react";
import { useState } from "react";

const hostname =
  location.hostname === "localhost" ? "http://localhost:3000" : "";

interface NewLinkProps extends TextInputProps {
  onLinkCreated?: () => void;
}

export function NewLink({ onLinkCreated, ...props }: NewLinkProps) {
  const theme = useMantineTheme();
  const [next, setNext] = useState(false);
  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      url: "",
      slug: "",
    },
    validate: {
      url: isNotEmpty(),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(({ url, slug }) => {
        if (url && slug) {
          fetch(`${hostname}/links`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, slug }),
          })
            .then(() => {
              setNext(false);
              form.reset();
              onLinkCreated?.();
            })
            .catch((err) => console.log(err));
        } else if (url) {
          setNext(true);
        }
      })}
    >
      <TextInput
        radius="sm"
        size="md"
        mb="md"
        disabled={next}
        placeholder="Paste a link to shorten it..."
        rightSectionWidth={42}
        leftSection={
          <IconLink style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
        }
        rightSection={
          !next && (
            <ActionIcon
              size={32}
              radius="xl"
              color={theme.primaryColor}
              variant="gradient"
              gradient={{ from: "grape", to: "indigo", deg: 113 }}
              type="submit"
            >
              <IconArrowRight
                style={{ width: rem(18), height: rem(18) }}
                stroke={1.5}
              />
            </ActionIcon>
          )
        }
        {...props}
        key={form.key("url")}
        {...form.getInputProps("url")}
      />
      {next && (
        <TextInput
          radius="sm"
          size="md"
          mb="md"
          placeholder="What should be the slug?"
          rightSectionWidth={42}
          leftSection={
            <IconTag style={{ width: rem(18), height: rem(18) }} stroke={1.5} />
          }
          rightSection={
            <ActionIcon
              size={32}
              radius="xl"
              color={theme.primaryColor}
              variant="gradient"
              gradient={{ from: "grape", to: "indigo", deg: 113 }}
              type="submit"
            >
              <IconArrowRight
                style={{ width: rem(18), height: rem(18) }}
                stroke={1.5}
              />
            </ActionIcon>
          }
          {...props}
          key={form.key("slug")}
          {...form.getInputProps("slug")}
        />
      )}
    </form>
  );
}
