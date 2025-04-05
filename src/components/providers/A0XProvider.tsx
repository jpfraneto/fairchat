import React, { createContext, useContext, useState } from "react";

interface A0XContextType {
  showA0XModal: boolean;
  setShowA0XModal: (value: boolean) => void;
}

const A0XContext = createContext<A0XContextType | undefined>(undefined);

export function useA0X() {
  const context = useContext(A0XContext);
  if (!context) {
    throw new Error("useA0X must be used within an A0XProvider");
  }
  return context;
}

export default function A0XProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showA0XModal, setShowA0XModal] = useState<boolean>(false);

  const value = {
    showA0XModal,
    setShowA0XModal,
  };

  return <A0XContext.Provider value={value}>{children}</A0XContext.Provider>;
}
