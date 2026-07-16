export interface FeedItem {
  id: string;
  memberId: string;
  timestamp: string;
  message: string;
}

export function ScannerFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="flex-1 w-full bg-zinc-900 rounded-2xl p-4 flex flex-col overflow-hidden">
      <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-4 shrink-0">
        Recent Scans
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 italic text-sm">
            No scans yet in this session
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={item.id} 
              className={`flex items-center gap-4 p-3 rounded-xl bg-zinc-800/50 border border-zinc-800/50
                ${index === 0 ? 'animate-in slide-in-from-top-2 fade-in duration-300' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-zinc-200 font-medium truncate">{item.message}</span>
                <span className="text-zinc-500 text-xs">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
