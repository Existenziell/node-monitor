import React, { useCallback, useEffect, useRef } from 'react';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';
import { useConsole } from '@/contexts/ConsoleContext';
import { useApi } from '@/contexts/ApiContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TabNav } from '@/components/TabNav';
import { NodeTab } from '@/components/tabs/NodeTab';
import { BlocksTab } from '@/components/tabs/BlocksTab';
import { WalletTab } from '@/components/tabs/WalletTab';
import { ConsoleTab } from '@/components/tabs/ConsoleTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import type { TabId } from '@/types';

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'node':
      return <NodeTab />;
    case 'blocks':
      return <BlocksTab />;
    case 'wallet':
      return <WalletTab />;
    case 'console':
      return <ConsoleTab />;
    case 'settings':
      return <SettingsTab />;
    default:
      return <NodeTab />;
  }
}

export default function App() {
  const { activeTab, setTab } = useTabFromUrl();
  const { log } = useConsole();
  const { fetchConfigStatus } = useApi();
  const hasCheckedConfig = useRef(false);

  React.useEffect(() => {
    log('Chain Monitor initialized', 'success');
    log('Loading initial data...', 'info');
  }, [log]);

  useEffect(() => {
    if (hasCheckedConfig.current) {
      return;
    }
    hasCheckedConfig.current = true;
    fetchConfigStatus()
      .then((s) => {
        if (!s.config_exists || !s.node_configured) {
          setTab('settings');
        }
      })
      .catch(() => {
        setTab('settings');
      });
  }, [fetchConfigStatus, setTab]);

  const handleRefresh = useCallback(() => {
    log(`Loading ${activeTab} data...`, 'info');
    setTab(activeTab);
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: activeTab }));
  }, [activeTab, setTab, log]);

  return (
    <div className="container max-w-[1400px] mx-auto p-5">
      <Header />
      <TabNav
        activeTab={activeTab}
        onTabChange={setTab}
        onRefresh={handleRefresh}
      />
      <section className="min-h-[200px]">
        <TabContent tab={activeTab} />
      </section>
      <Footer />
    </div>
  );
}
