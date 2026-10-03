import { useState, type ReactNode } from 'react';

import './IssueManagementTabs.css';

export type IssueManagementTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type IssueManagementTabsProps = {
  tabs: IssueManagementTab[];
  defaultTabId?: string;
  title?: string;
};

export function IssueManagementTabs({
  defaultTabId,
  tabs,
  title = 'Issue management',
}: Readonly<IssueManagementTabsProps>) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId ?? tabs[0]?.id ?? '');
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <section className="issue-management-panel">
      <header className="issue-management-header">
        <h3>{title}</h3>
        <div className="issue-management-tabs" role="tablist" aria-label={title}>
          {tabs.map((tab) => (
            <button
              aria-selected={activeTab.id === tab.id}
              className={activeTab.id === tab.id ? 'is-active' : ''}
              key={tab.id}
              role="tab"
              type="button"
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      <div className="issue-management-body" role="tabpanel">
        {activeTab.content}
      </div>
    </section>
  );
}
