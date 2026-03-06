import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import type { NotificationItem } from '@/contexts/NotificationContext';

const SLIDEOUT_MS = 350;

function NotificationItem({ item }: { item: NotificationItem }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={`
        pointer-events-auto rounded-lg border px-4 py-3 shadow-lg
        bg-level-2 border-level-3 text-level-5
        transform transition-all ease-out
        ${item.exiting ? '-translate-y-full opacity-0' : visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
      style={{
        transitionDuration: item.exiting ? `${SLIDEOUT_MS}ms` : '300ms',
      }}
    >
      <span className="text-sm font-medium">{item.message}</span>
    </div>
  );
}

export function NotificationContainer() {
  const { notifications } = useNotifications();

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 flex flex-col items-center gap-2 p-3 pointer-events-none"
      aria-live="polite"
    >
      {notifications.map((n) => (
        <NotificationItem key={n.id} item={n} />
      ))}
    </div>
  );
}
