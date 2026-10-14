import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix } from '@/config/constant'

const LOCAL_MUSIC_KEY = storageDataPrefix.localMusic

export const getLocalMusics = async(): Promise<LX.Music.MusicInfoLocal[]> => {
  return (await getData<LX.Music.MusicInfoLocal[]>(LOCAL_MUSIC_KEY)) || []
}

export const saveLocalMusics = async(musics: LX.Music.MusicInfoLocal[]) => {
  await saveData(LOCAL_MUSIC_KEY, musics)
}