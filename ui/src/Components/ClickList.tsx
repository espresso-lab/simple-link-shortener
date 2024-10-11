import { Table, TableData } from "@mantine/core";
import { fetchClicksForSlug } from "../Requests/api";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

type Clicks = {
  slug: string;
  datetime: Date;
  clientIpAddress: string;
  clientBrowser: string;
};

type Props = {
  slug: string;
};

export default function ClickList({ slug }: Props) {
  const [clicks, setClicks] = useState<Clicks[]>([]);

  useEffect(() => {
    fetchClicksForSlug(slug).then((clicks) => setClicks(clicks));
  }, [slug]);

  const tableData: TableData = {
    head: ["Date & Time", "Browser", "IP"],
    body: clicks.map((click) => [
      dayjs(click.datetime).format("DD/MM/YYYY HH:mm"),
      click.clientBrowser,
      click.clientIpAddress,
    ]),
  };

  return <Table data={tableData} />;
}
