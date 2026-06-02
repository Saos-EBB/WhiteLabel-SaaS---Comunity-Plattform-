'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const rafRef   = useRef<number>(0)
  const [isPlaying, setIsPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded          = () => {
      cancelAnimationFrame(rafRef.current)
      setIsPlaying(false)
      setCurrentTime(0)
      audio.currentTime = 0
    }
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  async function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      cancelAnimationFrame(rafRef.current)
      setIsPlaying(false)
    } else {
      try {
        await audio.play()
        setIsPlaying(true)
        function tick() {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch {
        // autoplay blocked or interrupted
      }
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect  = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(audio.currentTime)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="rounded-xl bg-surface-container-high px-4 py-3 flex items-center gap-3 w-full">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label="Vorstellung abspielen"
        className="flex-shrink-0 text-primary-fixed-dim hover:opacity-75 transition-opacity"
      >
        {isPlaying
          ? <Pause size={20} aria-hidden />
          : <Play  size={20} aria-hidden />
        }
      </button>

      <div
        className="flex-1 h-1.5 rounded-full bg-surface-container-highest cursor-pointer"
        onClick={handleSeek}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-primary-fixed-dim"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="flex-shrink-0 text-xs tabular-nums text-primary-fixed-dim select-none">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}
