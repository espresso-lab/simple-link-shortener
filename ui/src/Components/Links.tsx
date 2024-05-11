import { Suspense, use, useState } from "react";
import { useNotifications } from "../Context";
import CopyIcon from "../Icons/copy.svg";
import PlusIcon from "../Icons/plus.svg";
import TrashIcon from "../Icons/trash.svg";
import classes from "./Links.module.scss";

interface Link {
  id: string;
  title: string;
  slug: string;
  url: string;
  created_at: string;
  updated_at: string;
}

async function fetchLinks(): Promise<Link[]> {
  const response = await fetch("/links");
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
  fetchLinks: Promise<Link[]>;
  refetch: () => void;
}

function Link({ fetchLinks, refetch }: LinkProps) {
  const links = use(fetchLinks);
  const notifications = useNotifications();
  return links.map((link) => (
    <div key={link.id} className={classes.link}>
      <p style={{ flex: 1 }}>{link.title}</p>
      <p>{link.slug}</p>
      <p>{link.updated_at}</p>
      <Button
        icon={TrashIcon}
        onClick={() =>
          fetch(`/links/${link.id}`, { method: "DELETE" })
            .then(() => {
              refetch();
              notifications.notify({
                message: "Link deleted",
                type: "success",
              });
            })
            .catch(() => {
              notifications.notify({
                message: "Failed to delete link",
                type: "error",
              });
            })
        }
      />
      <Button
        icon={CopyIcon}
        onClick={() => {
          navigator.clipboard.writeText(`${document.location}${link.slug}`);
          notifications.notify({
            message: "Link copied to clipboard",
          });
        }}
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
  const notifications = useNotifications();
  const [fetchLinksPromise, setFetchLinksPromise] = useState<Promise<Link[]>>(
    () => fetchLinks()
  );
  const [formValues, setFormValues] = useState<FormValues>({
    url: "",
    title: "",
    slug: "",
  });
  return (
    <div className={classes.container}>
      <h3>Links</h3>
      <form
        action={() => {
          if (!formValues.url || !formValues.title || !formValues.slug) {
            notifications.notify({
              message: "All fields are required",
              type: "error",
            });
          } else {
            fetch("/links", {
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
                setFetchLinksPromise(() => fetchLinks());
                notifications.notify({
                  message: "Link created",
                  type: "success",
                });
              })
              .catch(() => {
                notifications.notify({
                  message: "Failed to create link",
                  type: "error",
                });
              });
          }
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
          <Link
            fetchLinks={fetchLinksPromise}
            refetch={() => setFetchLinksPromise(() => fetchLinks())}
          />
        </div>
      </Suspense>
    </div>
  );
}
