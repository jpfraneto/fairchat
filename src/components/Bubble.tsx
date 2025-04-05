import React from "react";
import { motion } from "framer-motion";

interface BubbleProps {
  fid: string;
  pfpUrl: string;
  ipfsHash: string;
}

const Bubble: React.FC<BubbleProps> = ({ fid, pfpUrl, ipfsHash }) => {
  const openFarcasterFrame = () => {
    window.open(
      "https://warpcast.com/~/frames/launch?domain=fairchat.lat",
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-[#87CEEB] text-[#800080] font-mono">
      <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
        <img
          src={pfpUrl}
          alt="Profile"
          className="w-32 h-32 rounded-full mb-8"
        />
        <h1 className="text-6xl md:text-8xl font-bold mb-8">
          <span className="text-[#800080]">FAR</span>
          <span className="text-black">TWINS</span>
        </h1>

        <p className="text-xl mb-8 font-mono text-black">
          CA: 0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7
        </p>

        <p className="text-xl mb-8 font-mono text-black">FID: {fid}</p>

        <audio controls className="mb-8">
          <source src={`https://ipfs.io/ipfs/${ipfsHash}`} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>

        <motion.button
          onClick={openFarcasterFrame}
          className="px-8 py-4 bg-[#800080] text-white text-xl font-bold
                   hover:bg-[#87CEEB] hover:text-[#800080] border-2 border-[#800080] transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          OPEN FARCASTER FRAME
        </motion.button>
      </div>
    </div>
  );
};

export default Bubble;
