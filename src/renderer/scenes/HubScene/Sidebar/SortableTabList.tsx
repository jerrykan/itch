import React from "react";
import SortableList from "renderer/basics/SortableList";
import Tab from "renderer/scenes/HubScene/Sidebar/Tab";

interface Props {
  items: string[];
  currentTab: string;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
}

const getKey = (tab: string) => tab;

export default function SortableTabList({
  items,
  currentTab,
  onSortEnd,
}: Props) {
  return (
    <SortableList
      items={items}
      getKey={getKey}
      ignoreSelector=".tab-close-button"
      onSortEnd={onSortEnd}
      renderItem={(tab) => (
        <Tab tab={tab} active={currentTab === tab} sortable />
      )}
    />
  );
}
