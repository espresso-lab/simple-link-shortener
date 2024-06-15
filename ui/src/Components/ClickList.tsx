import { Table, TableData } from "@mantine/core";
import { fetchClicksForSlug } from "../Requests/api";
import { useEffect, useState } from "react";

type Clicks = {
  slug: string;
  datetime: Date;
  client_ip_address: string;
  client_browser: string;
};

type Props = {
  slug: string;
};

export default function ClickList({ slug }: Props) {
  const [clicks, setClicks] = useState<Clicks[]>([]);

  useEffect(() => {
    fetchClicksForSlug(slug).then((clicks) => setClicks(clicks));
  }, []);

  const tableData: TableData = {
    head: ["Date & Time", "Browser", "IP"],
    body: clicks.map((click) => [
      click.datetime.toString(),
      click.client_browser,
      click.client_ip_address,
    ]),
  };

  return <Table data={tableData} />;
}
