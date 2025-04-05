import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import sdk from "@farcaster/frame-sdk";

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface FrameNotificationDetails {
  notificationId: string;
  notificationType: string;
}

interface FrameLocationContext {
  pathname: string;
  href: string;
}

export interface FrameContext {
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  location?: FrameLocationContext;
  client: {
    clientFid: number;
    added: boolean;
    safeAreaInsets?: SafeAreaInsets;
    notificationDetails?: FrameNotificationDetails;
  };
}

interface FarcasterContextType {
  fid: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  frameContext: FrameContext | null;
  isFarcasterFrame: boolean;
  setFrameContext: (frameContext: FrameContext) => void;
}

const FarcasterContext = createContext<FarcasterContextType>({
  fid: null,
  isConnected: false,
  isLoading: true,
  error: null,
  frameContext: null,
  isFarcasterFrame: true,
  setFrameContext: () => {},
});

export const useFarcaster = () => {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error("useFarcaster must be used within a FarcasterProvider");
  }
  return context;
};

interface FarcasterProviderProps {
  children: ReactNode;
}

export default function FarcasterProvider({
  children,
}: FarcasterProviderProps) {
  const [fid, setFid] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameContext, setFrameContext] = useState<FrameContext | null>(null);
  const [isFarcasterFrame, setIsFarcasterFrame] = useState(true);

  // POST "${https://oriented-lively-anchovy.ngrok-free.app}/api/disparo"
  useEffect(() => {
    const initializeFarcaster = async () => {
      console.log("Starting Farcaster initialization...");
      try {
        // Initialize SDK
        console.log("Initializing SDK...");

        console.log("SDK initialized successfully");

        // Get frame context
        console.log("Fetching frame context...");
        const context = (await sdk.context) as FrameContext;
        console.log("Received frame context:", context);
        setFrameContext(context);

        if (context?.user?.fid) {
          console.log("Found user FID:", context.user.fid);
          setFid(context.user.fid);
          setIsConnected(true);
          console.log("User connected successfully");
          const accounts = await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts",
          });
          if (accounts && accounts[0]) {
            const chainId = await sdk.wallet.ethProvider.request({
              method: "eth_chainId",
            });
            const chainIdDecimal =
              typeof chainId === "number" ? chainId : parseInt(chainId, 16);

            if (chainIdDecimal !== 8453) {
              await sdk.wallet.ethProvider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x2105" }], // Base mainnet chainId
              });
            }

            return accounts[0];
          }
        } else {
          console.log("No FID found, setting as non-Farcaster frame");
          setIsFarcasterFrame(false);
        }
      } catch (err) {
        console.error("Error initializing Farcaster:", err);
        setError("Failed to initialize Farcaster connection");
        console.log("Initialization failed with error:", err);
      } finally {
        console.log("Initialization complete, setting loading to false");
        setIsLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

  const value = {
    fid,
    isConnected,
    isLoading,
    error,
    frameContext,
    isFarcasterFrame,
    setFrameContext,
  };

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
}
