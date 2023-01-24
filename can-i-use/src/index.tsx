import { useState } from 'react';
import { round } from '@gilbarbara/helpers';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { Response, useFetch } from '@raycast/utils';

type ResponseData =
  | { data: Record<string, DataItem>; statuses: Record<string, string> }
  | { code: string; message: string };

interface DataItem {
  description: string;
  keywords: string;
  spec: string;
  status: string;
  title: string;
  url: string;
  usage_perc_a: number;
  usage_perc_y: number;
}

interface Item extends Omit<DataItem, 'keywords' | 'usage_perc_a' | 'usage_perc_y'> {
  keywords: string[];
  supportFull: number;
  supportPartial: number;
  usage: number;
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as ResponseData;

  if (!response.ok || 'message' in json) {
    throw new Error('message' in json ? json.message : response.statusText);
  }

  return {
    statuses: json.statuses,
    features: Object.entries(json.data).map(([key, value]) => {
      return {
        description: value.description,
        keywords: value.keywords.split(','),
        spec: value.spec,
        status: value.status,
        supportFull: value.usage_perc_y,
        supportPartial: value.usage_perc_a,
        title: value.title,
        url: `https://caniuse.com/#feat=${key}`,
        usage: round(value.usage_perc_y + value.usage_perc_a),
      } as Item;
    }),
  };
}

function filterItem(item: Item, query: string) {
  return (
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  );
}

function getUsageIcon(item: Item) {
  if (item.supportFull >= 90) {
    return { source: Icon.CircleProgress100, tintColor: Color.Green };
  }

  if (item.supportFull >= 75) {
    return { source: Icon.CircleProgress75, tintColor: Color.Yellow };
  }

  if (item.usage >= 50) {
    return { source: Icon.CircleProgress50, tintColor: Color.Orange };
  }

  if (item.usage >= 25) {
    return { source: Icon.CircleProgress25, tintColor: Color.Red };
  }

  return { source: Icon.Circle, tintColor: Color.Red };
}

export default function Search() {
  const [searchText, setSearchText] = useState('');
  const { data, isLoading } = useFetch('https://raw.github.com/Fyrd/caniuse/master/data.json', {
    parseResponse: parseFetchResponse,
  });
  const { features, statuses = {} } = data ?? {};

  const items = searchText && features ? features.filter(item => filterItem(item, searchText)) : [];

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search features..."
      throttle
    >
      {!searchText ? (
        <List.EmptyView
          icon={{ source: 'https://caniuse.com/img/favicon-128.png' }}
          title="Type something to get started"
        />
      ) : (
        <List.Section subtitle={`${items.length}`} title="Results">
          {items.map(searchResult => (
            <SearchListItem key={searchResult.title} item={searchResult} statuses={statuses} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SearchListItem({ item, statuses }: { item: Item; statuses: Record<string, string> }) {
  return (
    <List.Item
      accessories={[
        {
          icon: getUsageIcon(item),
          tooltip: `Usage: ${item.usage}%\n\nSuppported: ${item.supportFull}%\nPartially Supported: ${item.supportPartial}%`,
          text: `${item.usage}%`,
        },
        {
          icon: Icon.Heartbeat,
          tooltip: `Status: ${statuses[item.status]}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={item.url} />
            <Action.OpenInBrowser icon={Icon.Torch} title="Open Spec" url={item.spec} />
            <Action.CopyToClipboard
              content={item.url}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
              title="Copy Feature URL"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={Icon.ArrowRightCircle}
      keywords={item.keywords}
      title={item.title}
    />
  );
}
