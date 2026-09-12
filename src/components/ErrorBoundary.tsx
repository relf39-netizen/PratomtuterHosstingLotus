import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full border-t-8 border-red-500 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 text-2xl">
                ⚠️
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">เกิดข้อผิดพลาดของระบบ</h2>
                <p className="text-xs text-slate-400">Application Error Encountered</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono break-all">
              {this.state.error?.message || 'Unknown render error occurred.'}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition duration-200 shadow-md"
              >
                ลองโหลดใหม่อีกครั้ง (Reload)
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition duration-200"
              >
                ล้างแคชและรีเซ็ตระบบ (Clear Cache & Reset)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
