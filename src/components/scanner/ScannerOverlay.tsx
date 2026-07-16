import { ScannerState } from "./ScannerReducer";

interface ScannerOverlayProps {
  status: ScannerState;
}

export function ScannerOverlay({ status }: ScannerOverlayProps) {
  const isScanning = status === 'scanning';
  
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
      {/* Darkened outside, clear inside */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Reticle */}
      <div className={`relative w-64 h-64 border-4 rounded-3xl transition-all duration-300 z-20 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] bg-transparent
        ${isScanning ? 'border-blue-500 scale-95 shadow-blue-500/50 shadow-lg' : 'border-white/50 scale-100'}
      `}>
        {/* Scanning Line Animation */}
        {isScanning && (
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="w-full h-1 bg-blue-400 shadow-[0_0_20px_4px_rgba(59,130,246,0.5)] animate-[scan_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </div>
      
      {/* Instruction text */}
      <div className="mt-8 z-20 bg-black/60 px-6 py-2 rounded-full text-white font-medium text-lg backdrop-blur-sm">
        Align QR Code within the frame
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(256px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
