import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useStore } from '../hooks/useCallbackStore';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

export default function ToastContainer() {
  const { state } = useStore();

  return (
    <div className="toast-container">
      {state.toasts.map((toast) => {
        const Icon = ICONS[toast.type] || CheckCircle;
        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <Icon size={16} />
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
