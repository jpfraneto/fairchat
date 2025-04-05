import { useEffect, useState, useRef } from "react";
import { useFarcaster } from "./components/providers/FarcasterProvider";
import { motion } from "framer-motion";
import { PinataSDK } from "pinata";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useWriteContract } from "wagmi";
import { base } from "wagmi/chains";
import { FAIRCHAT_ABI } from "./lib/constants";
import sdk from "@farcaster/frame-sdk";
import { Play, Pause, Save, Trash2, StopCircle } from "lucide-react";

interface AppProps {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

interface Bubble {
  id: number;
  fid: number;
  cid: string;
  color: string;
}

const pinata = new PinataSDK({
  pinataJwt: "",
  pinataGateway: "anky.mypinata.cloud",
});

const App: React.FC<AppProps> = ({ isLoading, setIsLoading }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [
    currentRecordingStartingTimestamp,
    setCurrentRecordingStartingTimestamp,
  ] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [isPlayback, setIsPlayback] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const audioChunks = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [localBubbles, setLocalBubbles] = useState<Bubble[]>([]);
  const [currentUploadedCid, setCurrentUploadedCid] = useState<string | null>(
    null
  );

  const { frameContext } = useFarcaster();
  console.log("IS LOADING", isLoading);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  console.log("HASH", hash);
  console.log("IS PENDING", isPending);
  console.log("ERROR", error);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  console.log("IS CONFIRMING", isConfirming);
  console.log("IS CONFIRMED", isConfirmed);

  const { data: bubbles } = useReadContract({
    address: "0x07CcE141c48875A40Fb653211FFC0f569add5eca",
    abi: FAIRCHAT_ABI,
    functionName: "getBubbles",
    args: [],
  }) as { data: Bubble[] | undefined };

  const saveForever = async () => {
    if (!audioUrl) return;

    try {
      setIsUploadingRecording(true);
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], "recording.mp3", { type: "audio/mp3" });

      const urlResponse = await fetch(
        `https://pinata-server.fairchat.workers.dev/upload_url`,
        {
          method: "GET",
          headers: {
            // Handle authorization here
          },
        }
      );
      const data = await urlResponse.json();
      console.log("THE DATA IS", data);

      const upload = await pinata.upload.public.file(file).url(data.url);
      console.log("THE UPLOAD IS", upload);

      if (upload.cid) {
        console.log("File uploaded successfully!");
        const ipfsLink = await pinata.gateways.public.convert(upload.cid);

        console.log("IPFS Link:", ipfsLink);

        await writeContract({
          address:
            "0x07CcE141c48875A40Fb653211FFC0f569add5eca" as `0x${string}`,
          abi: FAIRCHAT_ABI,
          functionName: "saveRecordingForever",
          args: [upload.cid, frameContext?.user.fid],
          chainId: base.id,
        });

        // Create a new local bubble for immediate feedback
        const newBubble: Bubble = {
          id: Date.now(), // Temporary ID
          fid: frameContext?.user.fid || 0,
          cid: upload.cid,
          color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
        };

        setLocalBubbles((prev) => [...prev, newBubble]);
        setCurrentUploadedCid(upload.cid);

        // Reset state to allow new recording
        resetRecordingState();
      } else {
        console.log("Upload failed");
      }
    } catch (error) {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsUploadingRecording(false);
    }
  };

  const resetRecordingState = () => {
    setAudioUrl(null);
    setPlaybackProgress(0);
    setShowOptions(false);
    setIsPlayback(false);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  useEffect(() => {
    async function load() {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setCurrentRecordingStartingTimestamp(Date.now());
      setRecordingDuration(0);
      interval = setInterval(() => {
        const elapsed =
          (Date.now() - (currentRecordingStartingTimestamp || 0)) / 1000;
        setRecordingDuration(Math.floor(elapsed));
        if (elapsed >= 88) {
          setIsRecording(false);
          setIsPlayback(true);
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, currentRecordingStartingTimestamp]);

  useEffect(() => {
    if (isPlayback && audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);

      // Update playback progress in real-time
      audio.addEventListener("timeupdate", () => {
        setPlaybackProgress(Math.floor(audio.currentTime));
      });

      audio.addEventListener("ended", () => {
        setIsPlayback(false);
        setShowOptions(true);
        setIsPlaying(false);
      });

      return () => {
        audio.pause();
        audio.removeEventListener("timeupdate", () => {});
        audio.removeEventListener("ended", () => {});
      };
    }
  }, [isPlayback, audioUrl]);

  useEffect(() => {
    if (isRecording) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
          recorder.ondataavailable = (event) => {
            audioChunks.current.push(event.data);
          };
          recorder.onstop = () => {
            const audioBlob = new Blob(audioChunks.current, {
              type: "audio/mp3",
            });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            audioChunks.current = [];
          };
          recorder.start();
        })
        .catch((err) => console.error("Error accessing microphone:", err));
    } else if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setMediaRecorder(null);
    }
  }, [isRecording]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDelete = () => {
    resetRecordingState();
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (audioRef.current && audioRef.current.duration) {
      const seekTime = (value / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setPlaybackProgress(Math.floor(seekTime));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPlayback(true);
  };

  const handleOpenProfile = (fid: number) => {
    sdk.actions.viewProfile({ fid });
  };

  const playBubbleAudio = async (cid: string) => {
    try {
      // Get the IPFS link for the CID
      const ipfsLink = await pinata.gateways.public.convert(cid);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create and play the new audio
      const audio = new Audio(ipfsLink);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);

      // Handle audio events
      audio.addEventListener("timeupdate", () => {
        setPlaybackProgress(Math.floor(audio.currentTime));
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
    } catch (error) {
      console.error("Error playing bubble audio:", error);
    }
  };

  if (isLoading || !frameContext) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-24 h-24 rounded-full bg-white"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundImage: `url(/fairchat.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white"
    >
      {/* RENDER BUBBLES HERE */}
      <div className="absolute top-20 w-full flex flex-wrap justify-center gap-4 px-4">
        {/* Combine blockchain bubbles with local bubbles */}
        {[...(bubbles || []), ...localBubbles].map(
          (bubble: Bubble, index: number) => {
            // Generate a random color if not provided
            const bubbleColor =
              bubble.color ||
              `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;

            // Highlight the newly created bubble
            const isNewBubble = bubble.cid === currentUploadedCid;

            return (
              <div
                key={bubble.id || index}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => {
                  // If it's the user's bubble, play the audio
                  if (bubble.fid === frameContext?.user.fid) {
                    playBubbleAudio(bubble.cid);
                  } else {
                    handleOpenProfile(bubble.fid);
                  }
                }}
              >
                <div className="text-sm font-bold mb-1">FID: {bubble.fid}</div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    isNewBubble
                      ? {
                          scale: [1, 1.2, 1],
                          boxShadow: [
                            "0 0 0 0 rgba(255,255,255,0.7)",
                            "0 0 0 10px rgba(255,255,255,0)",
                            "0 0 0 0 rgba(255,255,255,0)",
                          ],
                        }
                      : {}
                  }
                  transition={
                    isNewBubble
                      ? {
                          repeat: 3,
                          duration: 1.5,
                        }
                      : {}
                  }
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-black font-bold ${
                    isNewBubble ? "ring-4 ring-white" : ""
                  }`}
                  style={{ backgroundColor: bubbleColor }}
                >
                  {bubble.fid}
                </motion.div>
              </div>
            );
          }
        )}
      </div>

      {isRecording && (
        <div className="absolute top-1/4 flex flex-col items-center">
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <motion.div
                className="absolute w-32 h-32 bg-red-500 opacity-20 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <div className="text-5xl font-bold text-white">
                {formatTime(recordingDuration)}
              </div>
            </div>
          </div>
          <div className="text-sm mb-6">Maximum recording time: 88 seconds</div>
        </div>
      )}

      {/* Main action button at the bottom */}
      <motion.div
        style={{ backgroundImage: `url(${frameContext.user.pfpUrl})` }}
        className={`absolute bottom-10 w-14 h-14 rounded-full bg-cover bg-center shadow-lg cursor-pointer ${
          isRecording ? "scale-120 border-2 border-red-500 animate-pulse" : ""
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (isRecording) {
            // Stop recording
            stopRecording();
          } else if (!isRecording && !isPlayback && !showOptions) {
            // Start recording
            setIsRecording(true);
          } else if ((isPlayback || showOptions) && audioUrl) {
            // Save recording
            saveForever();
          }
        }}
      >
        {/* Overlay icons on the profile picture button */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-50 rounded-full"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <StopCircle size={28} color="white" />
          </motion.div>
        )}
        {(isPlayback || showOptions) && audioUrl && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-50 rounded-full"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Save size={28} color="white" />
          </motion.div>
        )}
      </motion.div>

      {(isPlayback || showOptions) && audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-11/12 max-w-md backdrop-blur-md bg-black/60 p-6 rounded-xl shadow-2xl flex flex-col items-center"
        >
          {/* Waveform visualization placeholder */}
          <div className="w-full h-16 mb-2 bg-black/30 rounded-lg flex items-center justify-center overflow-hidden">
            <div className="flex items-end justify-around h-full w-full px-2">
              {[...Array(40)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-blue-500 rounded-full"
                  animate={{
                    height: isPlaying
                      ? `${Math.random() * 70 + 10}%`
                      : `${(Math.sin(i * 0.2) + 1) * 30 + 5}%`,
                  }}
                  transition={{
                    duration: 0.2,
                    repeat: isPlaying ? Infinity : 0,
                    repeatType: "mirror",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-2xl font-bold mb-3 text-blue-400">
            {formatTime(playbackProgress)}
          </div>

          {/* Custom Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-6 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full"
              style={{
                width: audioRef.current
                  ? `${(playbackProgress / audioRef.current.duration) * 100}%`
                  : "0%",
              }}
              initial={{ width: "0%" }}
              animate={{
                width: audioRef.current
                  ? `${(playbackProgress / audioRef.current.duration) * 100}%`
                  : "0%",
              }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>

          {/* Seek Slider */}
          <input
            type="range"
            min="0"
            max="100"
            value={
              audioRef.current
                ? (playbackProgress / audioRef.current.duration) * 100
                : 0
            }
            onChange={handleSeek}
            className="w-full mb-6 accent-blue-500"
          />

          {/* Control Buttons - Play/Pause and Delete */}
          <div className="flex justify-between w-full px-12 mb-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="bg-purple-600 text-white rounded-full p-4 shadow-lg hover:bg-purple-700 transition-all"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 transition-all"
              onClick={handleDelete}
            >
              <Trash2 size={28} />
            </motion.button>
          </div>

          {/* Status Text */}
          {isUploadingRecording && (
            <div className="text-green-500 text-center font-medium">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                Talking To The Void...
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default App;
