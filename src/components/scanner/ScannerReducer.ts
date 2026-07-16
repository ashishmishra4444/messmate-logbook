export type ScannerState = 
  | 'idle' 
  | 'scanning' 
  | 'success' 
  | 'duplicate' 
  | 'expired' 
  | 'invalid' 
  | 'wrong_session' 
  | 'blocked' 
  | 'offline' 
  | 'camera_error' 
  | 'perm_denied' 
  | 'manual_override' 
  | 'loading';

export interface ScannerUIState {
  status: ScannerState;
  message: string;
  details?: string;
  memberId?: string;
  scanTime?: string;
}

export type ScannerAction =
  | { type: 'START_SCAN' }
  | { type: 'SET_IDLE' }
  | { type: 'SET_SUCCESS'; memberId: string; message: string }
  | { type: 'SET_ERROR'; errorType: ScannerState; message: string; details?: string }
  | { type: 'OPEN_MANUAL_OVERRIDE' }
  | { type: 'CLOSE_MANUAL_OVERRIDE' }
  | { type: 'CAMERA_ERROR'; errorType: ScannerState; message: string };

export const initialScannerState: ScannerUIState = {
  status: 'idle',
  message: 'Ready to Scan'
};

export function scannerReducer(state: ScannerUIState, action: ScannerAction): ScannerUIState {
  switch (action.type) {
    case 'START_SCAN':
      return { ...state, status: 'scanning', message: 'Processing...' };
    case 'SET_IDLE':
      return { status: 'idle', message: 'Ready to Scan' };
    case 'SET_SUCCESS':
      return { 
        status: 'success', 
        message: action.message, 
        memberId: action.memberId,
        scanTime: new Date().toISOString()
      };
    case 'SET_ERROR':
      return {
        status: action.errorType,
        message: action.message,
        details: action.details,
        scanTime: new Date().toISOString()
      };
    case 'CAMERA_ERROR':
      return {
        status: action.errorType,
        message: action.message
      };
    case 'OPEN_MANUAL_OVERRIDE':
      return { ...state, status: 'manual_override', message: 'Manual Override' };
    case 'CLOSE_MANUAL_OVERRIDE':
      return { status: 'idle', message: 'Ready to Scan' };
    default:
      return state;
  }
}

export function getStateConfig(status: ScannerState) {
  switch (status) {
    case 'idle': return { color: 'bg-zinc-800', textColor: 'text-zinc-100', sound: null, timeout: 0 };
    case 'scanning': return { color: 'bg-blue-500', textColor: 'text-white', sound: null, timeout: 0 };
    case 'success': return { color: 'bg-green-500', textColor: 'text-white', sound: 'success', timeout: 1500 };
    case 'duplicate': return { color: 'bg-amber-500', textColor: 'text-black', sound: 'error', timeout: 2000 };
    case 'expired': return { color: 'bg-red-500', textColor: 'text-white', sound: 'error', timeout: 2000 };
    case 'invalid': return { color: 'bg-red-500', textColor: 'text-white', sound: 'error', timeout: 1500 };
    case 'wrong_session': return { color: 'bg-orange-500', textColor: 'text-white', sound: 'error', timeout: 2000 };
    case 'blocked': return { color: 'bg-red-900', textColor: 'text-white', sound: 'error', timeout: 3000 };
    case 'camera_error': return { color: 'bg-zinc-900', textColor: 'text-white', sound: 'error', timeout: 0 };
    case 'perm_denied': return { color: 'bg-zinc-900', textColor: 'text-white', sound: 'error', timeout: 0 };
    case 'offline': return { color: 'bg-zinc-600', textColor: 'text-white', sound: null, timeout: 0 };
    case 'manual_override': return { color: 'bg-background', textColor: 'text-foreground', sound: null, timeout: 0 };
    case 'loading': return { color: 'bg-zinc-800', textColor: 'text-zinc-400', sound: null, timeout: 0 };
    default: return { color: 'bg-zinc-800', textColor: 'text-zinc-100', sound: null, timeout: 0 };
  }
}
