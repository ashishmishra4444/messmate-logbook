import { useReducer, useState, useRef, useEffect } from "react";
import { scannerReducer, initialScannerState, ScannerState } from "./ScannerReducer";
import { ScannerCamera } from "./ScannerCamera";
import { ScannerOverlay } from "./ScannerOverlay";
import { ScannerStatusBanner } from "./ScannerStatusBanner";
import { ScannerKPIs } from "./ScannerKPIs";
import { ScannerFeed, FeedItem } from "./ScannerFeed";
import { DeviceStatus } from "./DeviceStatus";
import { useAudioEngine } from "./useAudioEngine";
import { useValidateIdentity } from "@/lib/api-attendance";
import { ManualOverrideDialog } from "@/components/ManualOverrideDialog";
import { Button } from "@/components/ui/button";

export function ScannerController() {
  const [state, dispatch] = useReducer(scannerReducer, initialScannerState);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [kpis, setKpis] = useState({ expected: 150, scanned: 0 }); // Mock expected for now
  const lastScannedText = useRef<string | null>(null);
  const lastScannedTime = useRef<number>(0);
  
  const { playSuccess, playError, playChime } = useAudioEngine();
  const validateIdentity = useValidateIdentity();

  const handleDecode = async (text: string) => {
    // Throttle exact same scans within 3 seconds
    const now = Date.now();
    if (text === lastScannedText.current && now - lastScannedTime.current < 3000) {
      return;
    }
    
    // Ignore if not idle
    if (state.status !== 'idle') return;

    lastScannedText.current = text;
    lastScannedTime.current = now;

    dispatch({ type: 'START_SCAN' });

    try {
      const response = await validateIdentity.mutateAsync({
        auth_type: 'qr',
        payload: text,
        scanner_name: 'Kitchen Tablet 1'
      });

      if (response.status === 'approved') {
        dispatch({ type: 'SET_SUCCESS', memberId: response.member_id || 'unknown', message: response.message || 'Approved' });
        playSuccess();
        
        // Update Session State (in-memory)
        setKpis(prev => ({ ...prev, scanned: prev.scanned + 1 }));
        setFeed(prev => [{
          id: Math.random().toString(),
          memberId: response.member_id || 'unknown',
          timestamp: new Date().toISOString(),
          message: `Approved Member`
        }, ...prev].slice(0, 10));

        // Auto-recover to idle
        setTimeout(() => dispatch({ type: 'SET_IDLE' }), 1500);
      } else {
        // Validation failed logically
        handleLogicalError(response);
      }
    } catch (error: any) {
      // It's already parsed as ValidationResult if it came from the edge function cleanly
      if (error.reason) {
        handleLogicalError(error);
      } else {
        dispatch({ type: 'SET_ERROR', errorType: 'invalid', message: 'Connection Error', details: error.message });
        playError();
        setTimeout(() => dispatch({ type: 'SET_IDLE' }), 2000);
      }
    }
  };

  const handleLogicalError = (response: any) => {
    playError();
    let errorType: ScannerState = 'invalid';
    
    if (response.reason === 'duplicate') errorType = 'duplicate';
    else if (response.reason === 'expired_qr') errorType = 'expired';
    else if (response.reason === 'outside_time') errorType = 'wrong_session';
    
    dispatch({ 
      type: 'SET_ERROR', 
      errorType, 
      message: response.message || 'Validation Failed',
      details: response.details ? `Time: ${new Date(response.details.time).toLocaleTimeString()}` : undefined
    });

    setTimeout(() => dispatch({ type: 'SET_IDLE' }), 2000);
  };

  const handleCameraError = (error: Error) => {
    dispatch({ type: 'CAMERA_ERROR', errorType: 'perm_denied', message: 'Camera Permission Denied' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && state.status === 'idle') {
        dispatch({ type: 'OPEN_MANUAL_OVERRIDE' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status]);

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden">
      <DeviceStatus />
      
      <div className="flex flex-1 h-[calc(100vh-64px)]">
        {/* Left Pane - 60% */}
        <div className="w-[60%] relative flex flex-col bg-zinc-950">
          <div className="flex-1 relative">
            <ScannerCamera 
              onDecode={handleDecode}
              paused={state.status !== 'idle' && state.status !== 'scanning'}
              onError={handleCameraError}
            />
            {state.status !== 'perm_denied' && (
              <ScannerOverlay status={state.status} />
            )}
          </div>
        </div>

        {/* Right Pane - 40% */}
        <div className="w-[40%] flex flex-col p-6 gap-6 bg-zinc-950 border-l border-zinc-900">
          <ScannerKPIs expected={kpis.expected} scanned={kpis.scanned} />
          
          <div className="flex-none">
            <ScannerStatusBanner state={state} />
          </div>
          
          <ScannerFeed items={feed} />

          <Button 
            variant="secondary"
            size="lg"
            className="w-full h-16 text-lg font-semibold mt-auto shadow-xl"
            onClick={() => dispatch({ type: 'OPEN_MANUAL_OVERRIDE' })}
            disabled={state.status === 'manual_override' || state.status === 'perm_denied'}
          >
            MANUAL OVERRIDE (Space)
          </Button>
        </div>
      </div>

      <ManualOverrideDialog 
        open={state.status === 'manual_override'}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE_MANUAL_OVERRIDE' });
        }}
        activeSessionId="todo_fetch_active_session_id" // Ideally passed down from DeviceStatus context or fetched
      />
    </div>
  );
}
