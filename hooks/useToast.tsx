import React from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

let toastId = 0;

export const useToast = () => {
    const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

    const showToast = React.useCallback((message: string, type: ToastType = 'success') => {
        const id = toastId++;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = React.useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const ToastContainer = React.useCallback(() => {
        return (
            <>
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </>
        );
    }, [toasts, removeToast]);

    return { showToast, ToastContainer };
};
