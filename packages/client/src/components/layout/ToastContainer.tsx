import { useUIStore } from '../../stores';

const TOAST_STYLES = {
  success: {
    bg: 'bg-green-800',
    border: 'border-green-600',
    icon: '✓',
    iconColor: 'text-green-400',
  },
  error: {
    bg: 'bg-red-800',
    border: 'border-red-600',
    icon: '✕',
    iconColor: 'text-red-400',
  },
  warning: {
    bg: 'bg-yellow-800',
    border: 'border-yellow-600',
    icon: '⚠',
    iconColor: 'text-yellow-400',
  },
  info: {
    bg: 'bg-blue-800',
    border: 'border-blue-600',
    icon: 'ℹ',
    iconColor: 'text-blue-400',
  },
} as const;

export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];

        return (
          <div
            key={toast.id}
            className={`${style.bg} ${style.border} border rounded-lg p-3 shadow-lg animate-slide-in`}
          >
            <div className="flex items-start gap-2">
              <span className={`${style.iconColor} text-lg`}>{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{toast.title}</p>
                {toast.message && (
                  <p className="text-gray-300 text-sm mt-0.5">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
