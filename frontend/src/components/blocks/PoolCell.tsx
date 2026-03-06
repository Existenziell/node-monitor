import { isUnknownPoolIdentifier } from '@/utils';
import { POOL_ICON_SIZE } from '@/constants';

export function PoolCell({
  identifier,
  poolByIdentifier,
  iconSize = POOL_ICON_SIZE,
}: {
  identifier: string | undefined;
  poolByIdentifier: Map<string, { name: string; icon?: string }>;
  iconSize?: number;
}) {
  const pool = identifier
    ? poolByIdentifier.get(identifier) ?? (isUnknownPoolIdentifier(identifier) ? poolByIdentifier.get('unknown') : undefined)
    : undefined;
  const displayName = pool?.name ?? identifier ?? '-';
  return (
    <div className="flex items-center gap-1.5 min-h-[20px]">
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
        aria-hidden
      >
        {pool?.icon ? (
          <img
            src={`/icons/pools/${pool.icon}`}
            alt=""
            width={iconSize}
            height={iconSize}
            className="object-contain"
            loading="lazy"
          />
        ) : null}
      </span>
      <span className="truncate">{displayName}</span>
    </div>
  );
}
