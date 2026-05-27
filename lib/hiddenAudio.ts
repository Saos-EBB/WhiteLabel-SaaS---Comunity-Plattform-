let audio: HTMLAudioElement | null = null

export function playHiddenAudio(): void {
  if (typeof window === 'undefined') return
  if (!audio) {
    audio = new Audio('/sounds/where_is_my_mind.mp3')
    audio.loop = true
    audio.volume = 0.5
  }
  audio.currentTime = 0
  audio.play().catch(() => {})
}

export function stopHiddenAudio(): void {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
}
