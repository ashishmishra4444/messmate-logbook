interface ScannerKPIsProps {
  expected: number;
  scanned: number;
}

export function ScannerKPIs({ expected, scanned }: ScannerKPIsProps) {
  const remaining = Math.max(0, expected - scanned);
  const progress = expected > 0 ? Math.min(100, (scanned / expected) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-4 w-full">
      <div className="bg-zinc-800 p-4 rounded-xl flex flex-col justify-center">
        <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Expected</span>
        <span className="text-2xl font-bold text-white">{expected}</span>
      </div>
      <div className="bg-zinc-800 p-4 rounded-xl flex flex-col justify-center">
        <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Scanned</span>
        <span className="text-2xl font-bold text-blue-400">{scanned}</span>
      </div>
      <div className="bg-zinc-800 p-4 rounded-xl flex flex-col justify-center">
        <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Remaining</span>
        <span className="text-2xl font-bold text-amber-400">{remaining}</span>
      </div>
      
      <div className="col-span-3 mt-2">
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
