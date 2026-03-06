import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveTab } from '@/contexts/TabContext';
import { useApi } from '@/contexts/ApiContext';
import { useRefreshState } from '@/contexts/RefreshContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { NotificationContainer } from '@/components/Notification';
import { TabNav } from '@/components/TabNav';
import { TABS } from '@/data/tabs';
import { NodeTab } from '@/components/tabs/NodeTab';
import { NetworkTab } from '@/components/tabs/NetworkTab';
import { BlocksTab } from '@/components/tabs/BlocksTab';
import { WalletTab } from '@/components/tabs/WalletTab';
import { ConsoleTab } from '@/components/tabs/ConsoleTab';
import { DocsTab } from '@/components/tabs/DocsTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import type { TabId } from '@/types';

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'node':
      return <NodeTab />;
    case 'network':
      return <NetworkTab />;
    case 'blocks':
      return <BlocksTab />;
    case 'wallet':
      return <WalletTab />;
    case 'console':
      return <ConsoleTab />;
    case 'docs':
      return <DocsTab />;
    case 'settings':
      return <SettingsTab />;
    default:
      return <NodeTab />;
  }
}

export default function App() {
  const { activeTab, setTab } = useActiveTab();
  const { setRefreshTabId } = useRefreshState();
  const { fetchConfigStatus } = useApi();
  const hasCheckedConfig = useRef(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setRefreshTabId(activeTab);
    setTab(activeTab);
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: activeTab }));
  }, [activeTab, setTab, setRefreshTabId]);

  return (
    <div className="container max-w-[1400px] mx-auto p-5 min-h-screen flex flex-col">
      <NotificationContainer />
      <Header
        activeTab={activeTab}
        onRefresh={handleRefresh}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setMobileMenuOpen((o) => !o)}
      />
      <TabNav
        activeTab={activeTab}
        onTabChange={setTab}
        onRefresh={handleRefresh}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <section className="min-h-[200px] flex-1">
        {TABS.map(({ id }) => (
          <div
            key={id}
            hidden={activeTab !== id}
            aria-hidden={activeTab !== id}
          >
            <TabContent tab={id} />
          </div>
        ))}
      </section>
      <Footer />
    </div>
  );
}
