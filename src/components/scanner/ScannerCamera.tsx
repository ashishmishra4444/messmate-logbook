import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

interface ScannerCameraProps {
  onDecode: (text: string) => void;
  paused: boolean;
  onError: (error: Error) => void;
}

export function ScannerCamera({ onDecode, paused, onError }: ScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const codeReader = new BrowserQRCodeReader();

    async function startCamera() {
      if (!videoRef.current) return;
      try {
        let stream: MediaStream;
        try {
          // Try rear camera first with 720p minimum for dense QR codes
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: { exact: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
        } catch (e) {
          // Fallback to any available camera with high resolution preference
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
        }
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setHasPermission(true);

        // Instead of letting ZXing open the camera again (which causes locks and low res),
        // we pass our high-resolution stream directly to ZXing.
        controlsRef.current = await codeReader.decodeFromStream(
          stream,
          videoRef.current,
          (result, error, controls) => {
            if (result && mounted) {
              onDecode(result.getText());
            }
            // Ignore NotFoundException, it just means no QR in frame yet
            if (error && error.name !== 'NotFoundException') {
               // log other errors
            }
          }
        );
      } catch (err: any) {
        if (mounted) {
          setHasPermission(false);
          onError(err);
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []); // Re-initializing ZXing is expensive, do it once.

  // Handle Pausing logic independently without stopping the camera stream
  // We just ignore the callbacks if paused, but visually we might want to freeze the frame?
  // For performance and UX, keeping the stream running is best, just ignore onDecode in the controller.
  
  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-zinc-950 text-white p-4 text-center">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-xl font-bold">Camera Error</h3>
          <p className="text-zinc-400 mt-2">No camera found or permission was denied. Please allow access or connect a webcam.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${paused ? 'opacity-50 grayscale transition-all duration-300' : 'opacity-100'}`}
        autoPlay
        playsInline
        muted
      />
    </div>
  );
}
