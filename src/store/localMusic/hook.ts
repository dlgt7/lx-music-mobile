import { useEffect, useState } from 'react'
import state from './state'

export const useLocalMusics = () => {
  const [musics, setMusics] = useState([...state.musics])

  useEffect(() => {
    const handler = () => {
      setMusics([...state.musics])
    }
    global.app_event.on('local_music_list_changed', handler)
    return () => {
      global.app_event.off('local_music_list_changed', handler)
    }
  }, [])

  return musics
}

export const useLocalMusicScanState = () => {
  const [isScanning, setIsScanning] = useState(state.isScanning)

  useEffect(() => {
    const handler = () => {
      setIsScanning(state.isScanning)
    }
    global.app_event.on('local_music_scan_state_changed', handler)
    return () => {
      global.app_event.off('local_music_scan_state_changed', handler)
    }
  }, [])

  return isScanning
}

export const useLocalMusicScanProgress = () => {
  const [progress, setProgress] = useState({ ...state.scanProgress })

  useEffect(() => {
    const handler = () => {
      setProgress({ ...state.scanProgress })
    }
    global.app_event.on('local_music_scan_progress_changed', handler)
    return () => {
      global.app_event.off('local_music_scan_progress_changed', handler)
    }
  }, [])

  return progress
}