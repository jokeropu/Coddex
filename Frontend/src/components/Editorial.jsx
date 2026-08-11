import { useState, useRef, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '../design/cn';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const YoutubeEditorial = ({ youtubeId, title, author }) => (
  <div className="flex flex-col gap-2">
    <div className="w-full border border-rule bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
        title={title || 'Video walkthrough'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full border-0"
      />
    </div>
    {(title || author) && (
      <p className="t-body-sm text-ink-3">
        {title}
        {author && (
          <>
            {title ? ' · ' : ''}
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 underline underline-offset-2 hover:text-line"
            >
              {author}
            </a>
          </>
        )}
      </p>
    )}
  </div>
);

const CloudinaryEditorial = ({ secureUrl, thumbnailUrl, duration }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative w-full border border-rule bg-sheet-sunk"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={secureUrl}
        poster={thumbnailUrl}
        onClick={togglePlayPause}
        className="aspect-video w-full cursor-pointer bg-black"
      />

      {!isPlaying && (
        <button
          onClick={togglePlayPause}
          aria-label="Play walkthrough"
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-[var(--c-on-brand)] transition-colors hover:brightness-90"
        >
          <Play className="ml-0.5 h-5 w-5" strokeWidth={2} fill="currentColor" />
        </button>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 border-t border-rule bg-sheet-raised px-2.5 py-1.5 transition-opacity duration-200',
          isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={togglePlayPause}
            className="flex h-6 w-6 shrink-0 items-center justify-center border border-rule-strong text-ink transition-colors hover:border-line hover:text-line"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause className="h-3 w-3" strokeWidth={2} fill="currentColor" />
              : <Play className="ml-px h-3 w-3" strokeWidth={2} fill="currentColor" />}
          </button>

          <span className="t-data shrink-0 text-ink-2">{formatTime(currentTime)}</span>

          <div className="relative min-w-0 flex-1">
            <div className="h-[3px] w-full bg-rule" aria-hidden />
            <div
              className="absolute inset-y-0 left-0 h-[3px] bg-line"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
              }}
              aria-label="Seek"
              className="absolute inset-0 h-[3px] w-full cursor-pointer appearance-none bg-transparent
                         [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-[3px]
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-line
                         [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-[3px]
                         [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-line"
            />
          </div>

          <span className="t-data shrink-0 text-ink-3">{formatTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

const Editorial = ({ provider = 'cloudinary', youtubeId, title, author, ...rest }) =>
  provider === 'youtube' && youtubeId
    ? <YoutubeEditorial youtubeId={youtubeId} title={title} author={author} />
    : <CloudinaryEditorial {...rest} />;

export default Editorial;
