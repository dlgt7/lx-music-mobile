import { queryAudioMediaStore, scanFolderRecursive, type MediaStoreAudioItem } from '@/utils/nativeModules/mediaStore'
import { readMetadata, type MusicMetadataFull } from '@/utils/localMediaMetadata'
import { getLocalMusics } from '@/utils/data/localMusic'
import localMusicState from '@/store/localMusic/state'
import localMusicActions from '@/store/localMusic/action'
import { setMusicList } from '@/utils/listManage'
import { formatPlayTime2 } from '@/utils'
import { externalStorageDirectoryPath } from '@/utils/fs'
import { toast } from '@/utils/tools'

const normalizePath = (path: string) => path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()

const getFileName = (path: string) => path.split(/\/|\\/).at(-1) ?? path

const buildFromMediaStore = (item: MediaStoreAudioItem, metadata: MusicMetadataFull | null): LX.Music.MusicInfoLocal => {
  const fileName = getFileName(item.path)
  const dotIndex = fileName.lastIndexOf('.')
  return {
    id: item.path,
    name: metadata?.name || (dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName) || item.title || fileName,
    singer: metadata?.singer || item.artist || '',
    source: 'local',
    interval: metadata?.interval ? formatPlayTime2(metadata.interval) : (item.duration ? formatPlayTime2(item.duration) : null),
    meta: {
      albumName: metadata?.albumName || item.album || '',
      filePath: item.path,
      songId: item.path,
      picUrl: '',
      ext: metadata?.ext || (dotIndex > 0 ? fileName.substring(dotIndex + 1) : ''),
    },
  }
}

const buildFromPath = (path: string, metadata: MusicMetadataFull | null): LX.Music.MusicInfoLocal => {
  const fileName = getFileName(path)
  const dotIndex = fileName.lastIndexOf('.')
  return {
    id: path,
    name: metadata?.name || (dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName),
    singer: metadata?.singer || '',
    source: 'local',
    interval: metadata?.interval ? formatPlayTime2(metadata.interval) : null,
    meta: {
      albumName: metadata?.albumName || '',
      filePath: path,
      songId: path,
      picUrl: '',
      ext: metadata?.ext || (dotIndex > 0 ? fileName.substring(dotIndex + 1) : ''),
    },
  }
}

const readMetadataBatch = async(paths: string[], onProgress?: (current: number, total: number) => void): Promise<Map<string, MusicMetadataFull | null>> => {
  const result = new Map<string, MusicMetadataFull | null>()
  const queue = [...paths]
  const total = paths.length
  let done = 0
  while (queue.length) {
    const tasks = [queue.shift(), queue.shift(), queue.shift(), queue.shift(), queue.shift()].filter(Boolean) as string[]
    await Promise.all(tasks.map(async p => {
      const info = await readMetadata(p).catch(() => null)
      result.set(p, info)
      done++
    }))
    if (onProgress) onProgress(done, total)
  }
  return result
}

export const scanLocalMusic = async() => {
  if (localMusicState.isScanning) return
  localMusicActions.setScanning(true)
  localMusicActions.setScanProgress(0, 0)
  try {
    const mediaStoreItems = await queryAudioMediaStore().catch(() => [] as MediaStoreAudioItem[])

    const seenPaths = new Set<string>()
    const dedupedMediaStore: MediaStoreAudioItem[] = []
    for (const item of mediaStoreItems) {
      const key = normalizePath(item.path)
      if (seenPaths.has(key)) continue
      seenPaths.add(key)
      dedupedMediaStore.push(item)
    }

    const extraPaths: string[] = []
    const root = externalStorageDirectoryPath
    if (root) {
      const musicDir = `${root}/Music`
      const found = await scanFolderRecursive(musicDir).catch(() => [] as string[])
      for (const p of found) {
        const key = normalizePath(p)
        if (!seenPaths.has(key)) {
          seenPaths.add(key)
          extraPaths.push(p)
        }
      }
    }

    const allPaths = [...dedupedMediaStore.map(i => i.path), ...extraPaths]
    const total = allPaths.length
    localMusicActions.setScanProgress(0, total)

    const metadataMap = await readMetadataBatch(allPaths, (current) => {
      localMusicActions.setScanProgress(current, total)
    })

    const musics: LX.Music.MusicInfoLocal[] = []
    for (const item of dedupedMediaStore) {
      musics.push(buildFromMediaStore(item, metadataMap.get(item.path) ?? null))
    }
    for (const p of extraPaths) {
      musics.push(buildFromPath(p, metadataMap.get(p) ?? null))
    }

    musics.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    localMusicActions.setScanProgress(total, total)
    localMusicActions.setMusics(musics)
    setMusicList('local_music', musics)
    global.app_event.myListMusicUpdate(['local_music'])
    toast(`本地音乐扫描完成，共 ${musics.length} 首`, 'long')
  } catch (error: any) {
    toast(`本地音乐扫描失败：${error.message ?? error}`, 'long')
  } finally {
    localMusicActions.setScanning(false)
  }
}

export const initLocalMusic = async() => {
  const musics = await getLocalMusics()
  localMusicActions.setMusicsSilent(musics)
  setMusicList('local_music', musics)
}

export const getLocalMusicList = () => localMusicState.musics