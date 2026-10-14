export interface InitState {
  musics: LX.Music.MusicInfoLocal[]
  isScanning: boolean
  scanProgress: { current: number, total: number }
}

const state: InitState = {
  musics: [],
  isScanning: false,
  scanProgress: { current: 0, total: 0 },
}

export default state