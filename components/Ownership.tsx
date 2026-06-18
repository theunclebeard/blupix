export interface OwnershipEventData {
  id: string;
  fromAddress: string | null;
  toAddress: string;
  transferredAt: string;
  salePriceEth: number | null;
  listingPriceEth: number | null;
  ensFrom: string | null;
  ensTo: string | null;
}

function shortAddr(addr: string | null, ens: string | null): string {
  if (!addr) return 'mint';
  if (ens) return ens;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function isCurrentOwnerHighlight(idx: number, total: number) {
  return idx === total - 1;
}

interface OwnershipProps {
  events: OwnershipEventData[];
  offersPublic: boolean;
}

export function Ownership({ events, offersPublic }: OwnershipProps) {
  if (!events.length) {
    return <div className="text-slate-500 text-sm py-4">No ownership history found.</div>;
  }

  return (
    <div>
      <h3 className="font-pixel text-xs text-[#4b9fe1] mb-4">Ownership Biography</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-[#1e3a5f] text-slate-500">
              <th className="text-left py-2 pr-4 font-normal">#</th>
              <th className="text-left py-2 pr-4 font-normal">Wallet</th>
              <th className="text-left py-2 pr-4 font-normal">Held from</th>
              <th className="text-left py-2 pr-4 font-normal">Duration</th>
              {offersPublic && <th className="text-left py-2 font-normal">Sale price</th>}
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => {
              const isCurrent = isCurrentOwnerHighlight(i, events.length);
              const date = new Date(ev.transferredAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              // Rough hold duration to next event
              const nextDate = events[i + 1]
                ? new Date(events[i + 1].transferredAt)
                : new Date();
              const holdMs = nextDate.getTime() - new Date(ev.transferredAt).getTime();
              const holdDays = Math.floor(holdMs / (1000 * 60 * 60 * 24));
              const holdLabel = holdDays === 0
                ? '<1 day'
                : holdDays === 1
                ? '1 day'
                : `${holdDays} days`;

              return (
                <tr
                  key={ev.id}
                  className={`border-b border-[#1e3a5f] ${isCurrent ? 'text-white' : ''}`}
                >
                  <td className="py-2 pr-4 text-slate-500">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <a
                      href={`https://etherscan.io/address/${ev.toAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4b9fe1] hover:underline"
                    >
                      {shortAddr(ev.toAddress, ev.ensTo)}
                    </a>
                    {isCurrent && (
                      <span className="ml-2 font-pixel text-[9px] text-yellow-400">current</span>
                    )}
                    {!ev.fromAddress && (
                      <span className="ml-2 text-slate-600 text-[10px]">minter</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{date}</td>
                  <td className="py-2 pr-4 text-slate-400">
                    {isCurrent ? `${holdDays}d+` : holdLabel}
                  </td>
                  {offersPublic && (
                    <td className="py-2">
                      {ev.salePriceEth
                        ? <span className="text-green-400">{ev.salePriceEth} ETH</span>
                        : <span className="text-slate-600">—</span>
                      }
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
