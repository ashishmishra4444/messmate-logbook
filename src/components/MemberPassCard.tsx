import { useState, useEffect } from "react";
import { DynamicQR } from "./DynamicQR";
import { useGenerateQRToken } from "@/lib/api-qr";
import { cn } from "@/lib/utils";
import { User, MapPin, Coffee, ShieldCheck, Clock, WifiOff, RefreshCcw } from "lucide-react";

interface MemberPassCardProps {
  memberId: string;
  memberName: string;
  roomNumber: string;
  mealPlan: string;
  photoUrl?: string;
  deviceId: string;
  sessionId: string;
  todayEligibility: string;
}

export function MemberPassCard({
  memberId,
  memberName,
  roomNumber,
  mealPlan,
  photoUrl,
  deviceId,
  sessionId,
  todayEligibility
}: MemberPassCardProps) {
  // Fetch Token (Refreshes every 25s)
  const { data: qrData, isLoading, isError, isFetching } = useGenerateQRToken(deviceId, sessionId);

  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (qrData?.expires_at) {
      // Calculate remaining time
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, qrData.expires_at - now);
        setTimeLeft(remaining);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [qrData?.expires_at]);

  // Determine visual status
  let statusColor = "bg-green-500";
  let statusText = "Valid";
  let StatusIcon = ShieldCheck;

  if (isError) {
    statusColor = "bg-red-500";
    statusText = "Offline";
    StatusIcon = WifiOff;
  } else if (isFetching && !qrData) {
    statusColor = "bg-orange-500";
    statusText = "Reconnecting...";
    StatusIcon = RefreshCcw;
  } else if (timeLeft <= 5 && timeLeft > 0) {
    statusColor = "bg-amber-500";
    statusText = "Expiring Soon";
    StatusIcon = Clock;
  } else if (timeLeft === 0 && qrData) {
    statusColor = "bg-red-500";
    statusText = "Expired";
    StatusIcon = Clock;
  }

  return (
    <div className="w-full max-w-sm mx-auto relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-900 to-zinc-950 text-white shadow-2xl border border-zinc-800">
      
      {/* Background Decorative Blobs */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-8 flex flex-col items-center">
        
        {/* Header / Brand */}
        <div className="w-full flex justify-between items-center mb-8">
          <span className="text-xl font-bold tracking-tight text-zinc-100">MessMate</span>
          <div className="px-3 py-1 rounded-full bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 text-[10px] font-medium tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", statusColor, (statusText === "Valid" || statusText === "Reconnecting...") && "animate-pulse")} />
            {statusText}
          </div>
        </div>

        {/* Member Profile Info */}
        <div className="w-full flex items-center gap-4 mb-8">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0 shadow-inner">
            {photoUrl ? (
              <img src={photoUrl} alt={memberName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <User className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-zinc-100 leading-tight">{memberName}</h2>
            <p className="text-sm font-mono text-zinc-400 mt-0.5">{memberId}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-8">
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Room</span>
            </div>
            <p className="text-sm font-medium text-zinc-200">{roomNumber}</p>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Coffee className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Plan</span>
            </div>
            <p className="text-sm font-medium text-zinc-200 capitalize">{mealPlan.replace('_', ' & ')}</p>
          </div>
        </div>

        {/* Dynamic QR Section */}
        <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center backdrop-blur-md relative z-10 shadow-xl">
          <DynamicQR 
            token={qrData?.token || null} 
            isLoading={isLoading} 
            isError={isError} 
            lastUpdatedAt={qrData?.issued_at}
          />
          
          {/* Refresh Timer */}
          {!isError && (
            <div className="mt-5 flex items-center gap-2 text-zinc-400 bg-zinc-950/50 px-4 py-1.5 rounded-full border border-zinc-800/50">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">
                {timeLeft > 0 ? `Refreshes in ${timeLeft}s` : "Refreshing..."}
              </span>
            </div>
          )}
        </div>

        {/* Today's Eligibility */}
        <div className="w-full mt-6 text-center">
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Today's Eligibility</p>
          <p className="text-sm font-medium text-zinc-300">{todayEligibility}</p>
        </div>

      </div>
    </div>
  );
}
