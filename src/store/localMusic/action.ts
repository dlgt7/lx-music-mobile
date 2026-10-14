import state from './state'
import { saveLocalMusics } from '@/utils/data/localMusic'
import { throttle } from '@/utils'

const throttledSave = throttle(() => {
  void saveLocalMusics(state.musics)
}, 1000)

export default {
  setMusics(musics: LX.Music.MusicInfoLocal[]) {
    state.musics = musics
    global.app_event.local_music_list_changed()
    throttledSave()
  },
  setMusicsSilent(musics: LX.Music.MusicInfoLocal[]) {
    state.musics = musics
    global.app_event.local_music_list_changed()
  },
  removeMusics(ids: string[]) {
    const idSet = new Set(ids)
    state.musics = state.musics.filter(m => !idSet.has(m.id))
    global.app_event.local_music_list_changed()
    throttledSave()
  },
  clearMusics() {
    state.musics = []
    global.app_event.local_music_list_changed()
    throttledSave()
  },
  setScanning(isScanning: boolean) {
    state.isScanning = isScanning
    global.app_event.local_music_scan_state_changed()
  },
  setScanProgress(current: number, total: number) {
    state.scanProgress = { current, total }
    global.app_event.local_music_scan_progress_changed()
  },
}