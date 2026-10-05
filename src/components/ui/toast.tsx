import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<
  (message: string, tone?: ToastTone) => void
>(() => {});

// Para disparar un aviso desde cualquier pantalla
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

interface ToastProps {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
}

// Aviso flotante que se cierra solo
export function Toast({ message, tone = "success", onClose }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
    // El tiempo corre desde que aparece el mensaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const Icon = tone === "success" ? CheckCircle2 : XCircle;

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-lg",
        tone === "success" ? "text-foreground" : "text-destructive"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          tone === "success" ? "text-emerald-500" : "text-destructive"
        )}
      />
      {message}
    </div>
  );
}
