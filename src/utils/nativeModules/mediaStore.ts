import { NativeModules } from 'react-native'

export interface MediaStoreAudioItem {
  path: string
  title: string
  artist: string
  album: string
  duration: number
  size: number
  mimeType: string
}

const nativeModule = NativeModules.MediaStoreModule as {
  queryAudioMediaStore: () => Promise<MediaStoreAudioItem[]>
  scanFolderRecursive: (dirPath: string) => Promise<string[]>
} | undefined

export const queryAudioMediaStore = async(): Promise<MediaStoreAudioItem[]> => {
  if (!nativeModule) return []
  return nativeModule.queryAudioMediaStore()
}

export const scanFolderRecursive = async(dirPath: string): Promise<string[]> => {
  if (!nativeModule) return []
  return nativeModule.scanFolderRecursive(dirPath)
}