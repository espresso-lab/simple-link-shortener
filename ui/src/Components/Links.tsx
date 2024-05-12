import { Suspense, useEffect, useState } from "react";
import { useNotifications } from "../Context";
import CopyIcon from "../Icons/copy.svg";
import PlusIcon from "../Icons/plus.svg";
import TrashIcon from "../Icons/trash.svg";
import classes from "./Links.module.scss";
import { copy } from "../Utils";

interface Link {
  id: string;
  title: string;
  slug: string;
  url: string;
  created_at: string;
  updated_at: string;
}

const hostname =
  location.hostname === "localhost" ? "http://localhost:3000" : "";

async function fetchLinks(): Promise<Link[]> {
  const response = await fetch(`${hostname}/links`);
  return response.json();
}

interface ButtonProps {
  isSubmit?: boolean;
  icon: string;
  onClick?: () => void;
}

function Button({ icon, onClick, isSubmit }: ButtonProps) {
  return (
    <button
      {...(isSubmit && { type: "submit" })}
      className={classes.button}
      onClick={onClick}
    >
      <img className={classes.icon} src={icon} />
    </button>
  );
}

interface LinkProps {
  links: Link[];
  refetch: () => void;
}

function Link({ links, refetch }: LinkProps) {
  const { notify } = useNotifications();
  return links.map((link) => (
    <div key={link.id} className={classes.link}>
      <p style={{ flex: 1 }}>{link.title}</p>
      <p>{link.slug}</p>
      <p>{link.updated_at}</p>
      <Button
        icon={TrashIcon}
        onClick={() =>
          fetch(`${hostname}/links/${link.id}`, { method: "DELETE" })
            .then(() => {
              refetch();
              notify({
                message: "Link deleted.",
                type: "success",
              });
            })
            .catch(() => {
              notify({
                message: "Failed to delete link.",
                type: "error",
              });
            })
        }
      />
      <Button
        icon={CopyIcon}
        onClick={() =>
          copy(`${document.location}${link.slug}`)
            .then(() =>
              notify({
                type: "success",
                message: "Link copied to clipboard.",
              })
            )
            .catch((error: string) => notify({ type: "error", message: error }))
        }
      />
    </div>
  ));
}

interface FormValues {
  url: string;
  title: string;
  slug: string;
}

export function Links() {
  const [links, setLinks] = useState<Link[]>([]);
  const { notify } = useNotifications();
  const [formValues, setFormValues] = useState<FormValues>({
    url: "",
    title: "",
    slug: "",
  });

  useEffect(() => {
    fetchLinks().then(setLinks);
  }, []);

  return (
    <div className={classes.container}>
      <h3>Links</h3>
      <form
        onSubmit={(event) => {
          if (!formValues.url || !formValues.title || !formValues.slug) {
            notify({
              message: "Please provide all fields.",
              type: "error",
            });
          } else {
            fetch(`${hostname}/links`, {
              method: "POST",
              body: JSON.stringify(formValues),
              headers: {
                "Content-Type": "application/json",
              },
            })
              .then(() => {
                setFormValues({
                  url: "",
                  title: "",
                  slug: "",
                });
                fetchLinks().then(setLinks);
                notify({
                  message: "Link created.",
                  type: "success",
                });
              })
              .catch(() => {
                notify({
                  message: "Failed to create link.",
                  type: "error",
                });
              });
          }
          event.preventDefault();
        }}
      >
        <div className={classes.form}>
          <input
            value={formValues.url}
            onChange={(e) =>
              setFormValues((v) => ({ ...v, url: e.target.value }))
            }
            style={{ flex: 1 }}
            type="text"
            name="url"
            placeholder="url"
          />
          <input
            value={formValues.title}
            onChange={(e) =>
              setFormValues((v) => ({ ...v, title: e.target.value }))
            }
            type="text"
            name="title"
            placeholder="title"
          />
          <input
            value={formValues.slug}
            onChange={(e) =>
              setFormValues((v) => ({ ...v, slug: e.target.value }))
            }
            type="text"
            name="slug"
            placeholder="slug"
          />
          <Button isSubmit icon={PlusIcon} />
        </div>
      </form>
      <Suspense fallback={<div>Loading...</div>}>
        <div className={classes.links}>
          <Link links={links} refetch={() => fetchLinks().then(setLinks)} />
        </div>
      </Suspense>
    </div>
  );
}
