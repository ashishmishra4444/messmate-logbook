import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicQRProps {
  token: string | null;
  isLoading: boolean;
  isError: boolean;
  lastUpdatedAt?: number; // timestamp
}

export function DynamicQR({ token, isLoading, isError, lastUpdatedAt }: DynamicQRProps) {
  const [animationState, setAnimationState] = useState<"visible" | "fading_out" | "loading" | "fading_in">("visible");
  const [displayToken, setDisplayToken] = useState<string | null>(token);

  useEffect(() => {
    if (token !== displayToken) {
      // Trigger refresh animation sequence
      setAnimationState("fading_out");
      
      const fadeOutTimer = setTimeout(() => {
        setAnimationState("loading");
        
        // Wait a tiny bit in loading state for visual feedback
        const loadTimer = setTimeout(() => {
          setDisplayToken(token);
          setAnimationState("fading_in");
          
          const fadeInTimer = setTimeout(() => {
            setAnimationState("visible");
          }, 300); // fade in duration
          
          return () => clearTimeout(fadeInTimer);
        }, 400); // loading duration
        
        return () => clearTimeout(loadTimer);
      }, 300); // fade out duration
      
      return () => clearTimeout(fadeOutTimer);
    }
  }, [token, displayToken]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative bg-white p-4 rounded-xl shadow-inner w-[200px] h-[200px] flex items-center justify-center overflow-hidden">
        
        {/* Offline / Error State */}
        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 text-muted-foreground z-20 backdrop-blur-sm">
            <span className="text-sm font-semibold">Offline</span>
          </div>
        )}

        {/* Loading Spinner State */}
        {(isLoading || animationState === "loading") && !isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* QR Code with fade transitions */}
        <div 
          className={cn(
            "transition-opacity duration-300 ease-in-out",
            animationState === "visible" ? "opacity-100" : "opacity-0"
          )}
        >
          {displayToken ? (
            <QRCode value={displayToken} size={168} />
          ) : (
            <div className="w-[168px] h-[168px] bg-gray-100 rounded-lg animate-pulse" />
          )}
        </div>
      </div>
      
      {/* Last Updated Timestamp */}
      <div className="mt-4 text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 opacity-70">
        <div className={cn("w-1.5 h-1.5 rounded-full", isError ? "bg-red-500" : "bg-green-500")} />
        {lastUpdatedAt ? `Last updated: ${new Date(lastUpdatedAt * 1000).toLocaleTimeString()}` : 'Waiting for sync...'}
      </div>
    </div>
  );
}
