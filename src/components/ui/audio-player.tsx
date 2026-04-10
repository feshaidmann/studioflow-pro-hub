import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  fileName?: string;
  className?: string;
}

function formatTime(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src, fileName, className }: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) a.pause(); else a.play();
    setPlaying(!playing);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
  };

  return (
    <div className={cn("flex items-center gap-2 rounded-lg bg-muted/40 border border-border px-2.5 py-1.5", className)}>
      <audio ref={ref} src={src} preload="metadata" controlsList="nodownload" muted={muted} />
      <button onClick={toggle} className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors text-primary">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={current}
        onChange={seek}
        className="flex-1 h-1 accent-primary cursor-pointer"
        style={{ minWidth: 60 }}
      />
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
        {formatTime(current)}/{formatTime(duration)}
      </span>
      <button onClick={() => setMuted(!muted)} className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground">
        {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
      </button>
    </div>
  );
}
