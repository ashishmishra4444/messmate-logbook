import { ScannerUIState, getStateConfig } from "./ScannerReducer";

export function ScannerStatusBanner({ state }: { state: ScannerUIState }) {
  const config = getStateConfig(state.status);
  
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="w-full bg-zinc-800 rounded-2xl p-6 shadow-md transition-all duration-300 min-h-[120px] flex items-center justify-center">
        <h2 className="text-zinc-400 text-2xl font-medium tracking-wide">
          {state.message}
        </h2>
      </div>
    );
  }

  return (
    <div 
      className={`w-full rounded-2xl p-8 shadow-2xl transition-all duration-300 min-h-[160px] flex flex-col justify-center
      ${config.color} ${config.textColor} animate-in zoom-in-95`}
      role="alert" 
      aria-live="assertive"
    >
      <h2 className="text-4xl font-bold tracking-tight mb-2 uppercase flex items-center gap-3">
        {state.status === 'success' && (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {state.status === 'duplicate' && (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        )}
        {state.message}
      </h2>
      {state.details && (
        <p className="text-xl opacity-90 font-medium">
          {state.details}
        </p>
      )}
    </div>
  );
}
