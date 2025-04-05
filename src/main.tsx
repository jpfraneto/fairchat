import "./index.css";

import React, {
  useEffect,
  useState,
  Component,
  ErrorInfo,
  ReactNode,
} from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import sdk from "@farcaster/frame-sdk";
import App from "./App";
import { FrameContext } from "./components/providers/FarcasterProvider";
import FarcasterProvider from "./components/providers/FarcasterProvider";
import { WagmiProvider } from "wagmi";
import A0XProvider from "./components/providers/A0XProvider";
import { config } from "./lib/wagmiConfig";
import { useFarcaster } from "./components/providers/FarcasterProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

console.log("QueryClient created:", queryClient);

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-screen bg-black text-white p-8 flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <pre className="bg-gray-800 p-4 rounded mb-6 max-w-2xl overflow-auto">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface UserCharacteristics {
  emoji: string;
  label: string;
  description: string;
  options: [
    {
      value: string;
      description: string;
    }
  ];
}

function Root() {
  console.log("Rendering Root component");
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const { setFrameContext } = useFarcaster();

  useEffect(() => {
    const load = async () => {
      console.log("Initializing SDK...");

      await sdk.actions.ready();
      const context = await sdk.context;
      console.log("SDK context loaded:", context);
      setFrameContext(context as FrameContext);
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<App isLoading={isLoading} setIsLoading={setIsLoading} />}
        />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <BrowserRouter>
            <A0XProvider>
              <FarcasterProvider>
                <Root />
              </FarcasterProvider>
            </A0XProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
