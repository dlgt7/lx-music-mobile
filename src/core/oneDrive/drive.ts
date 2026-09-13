import RNFS from 'react-native-fs'
import RNFetchBlob from 'rn-fetch-blob'
import { getData, saveData } from '@/plugins/storage'
import { getValidOneDriveAuth } from './auth'

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0/me/drive'
const CONFIG_KEY = '@onedrive_config'
const SIMPLE_UPLOAD_LIMIT = 250 * 1024 * 1024
const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024

const getFolderItemUrl = (folder: LX.OneDrive.DriveFolder | null | undefined) => {
  return folder?.id
    ? `${GRAPH_ROOT}/items/${encodeURIComponent(folder.id)}`
    : `${GRAPH_ROOT}/root`
}

const getUploadUrl = (
  folder: LX.OneDrive.DriveFolder | null | undefined,
  fileName: string,
  action: 'content' | 'createUploadSession'
) => {
  return `${getFolderItemUrl(folder)}:/${encodeURIComponent(fileName)}:/${action}`
}

const normalizePath = (path: string | undefined, name: string) => {
  return path ? `${path}/${name}` : name
}

const getExt = (name: string) => {
  const ext = name.split('.').pop()
  return ext && ext != name ? ext.toLowerCase() : ''
}

const getContentType = (fileName: string) => {
  const ext = getExt(fileName)
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'flac':
      return 'audio/flac'
    case 'm4a':
      return 'audio/mp4'
    case 'aac':
      return 'audio/aac'
    case 'ogg':
    case 'oga':
      return 'audio/ogg'
    case 'opus':
      return 'audio/opus'
    case 'wav':
      return 'audio/wav'
    case 'lrc':
      return 'text/plain; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

const readAllPages = async <T>(url: string): Promise<T[]> => {
  const result: T[] = []
  let nextUrl: string | undefined = url
  while (nextUrl) {
    const body: { value: T[]; '@odata.nextLink'?: string } = await requestGraph(nextUrl)
    result.push(...(body.value ?? []))
    nextUrl = body['@odata.nextLink']
  }
  return result
}

const getChildrenUrl = (folderId?: string) => {
  return folderId
    ? `${GRAPH_ROOT}/items/${encodeURIComponent(folderId)}/children?$top=200`
    : `${GRAPH_ROOT}/root/children?$top=200`
}

const requestGraph = async <T>(url: string): Promise<T> => {
  const auth = await getValidOneDriveAuth()
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.error?.message ?? body.error_description ?? 'OneDrive request failed')
  }
  return body as T
}

export const listOneDriveFolders = async (folder?: LX.OneDrive.DriveFolder | null) => {
  const items = await readAllPages<LX.OneDrive.DriveFile & { folder?: unknown }>(
    getChildrenUrl(folder?.id)
  )
  return items
    .filter(item => item.folder)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map<LX.OneDrive.DriveFolder>(item => ({
      id: item.id,
      name: item.name,
      parentId: folder?.id,
      path: normalizePath(folder?.path, item.name),
    }))
}

export const saveOneDriveDownloadFolder = async (folder: LX.OneDrive.DriveFolder | null) => {
  const config = await getOneDriveConfig()
  config.downloadFolder = folder
  config.downloadFolderSelected = true
  await saveOneDriveConfig(config)
  return config
}

export const getOneDriveConfig = async (): Promise<LX.OneDrive.Config> => {
  const config = (await getData<LX.OneDrive.Config>(CONFIG_KEY)) ?? {
    selectedFolder: null,
    songs: [],
  }
  return config
}

export const saveOneDriveConfig = async (config: LX.OneDrive.Config) => {
  await saveData(CONFIG_KEY, config)
}

export const getOneDriveDownloadFolder = (config: LX.OneDrive.Config) => {
  return config.downloadFolder ?? config.selectedFolder ?? null
}

const parseGraphBlobResponse = (response: any) => {
  const status = response.info().status
  let body: any = {}
  try {
    const text = response.text()
    body = text ? JSON.parse(text) : {}
  } catch {}
  if (status < 200 || status >= 300) {
    if (status == 401 || status == 403) {
      throw new Error('OneDrive 授权已过期或缺少 Files.ReadWrite 权限，请重新登录 OneDrive')
    }
    throw new Error(body.error?.message ?? body.error_description ?? 'OneDrive upload failed')
  }
  return body
}

const createUploadSession = async (
  folder: LX.OneDrive.DriveFolder | null | undefined,
  fileName: string
) => {
  const auth = await getValidOneDriveAuth()
  const response = await fetch(getUploadUrl(folder, fileName, 'createUploadSession'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      item: {
        '@microsoft.graph.conflictBehavior': 'replace',
        name: fileName,
      },
    }),
  })
  const body = await response.json()
  if (!response.ok) {
    if (response.status == 401 || response.status == 403) {
      throw new Error('OneDrive 授权已过期或缺少 Files.ReadWrite 权限，请重新登录 OneDrive')
    }
    throw new Error(body.error?.message ?? body.error_description ?? 'OneDrive upload session failed')
  }
  return body.uploadUrl as string
}

export const uploadOneDriveFile = async ({
  localPath,
  fileName,
  folder,
  onProgress,
}: {
  localPath: string
  fileName: string
  folder?: LX.OneDrive.DriveFolder | null
  onProgress?: (uploaded: number, total: number) => void
}) => {
  const auth = await getValidOneDriveAuth()
  const stat = await RNFS.stat(localPath)
  const total = Number(stat.size)
  const contentType = getContentType(fileName)
  let item: LX.OneDrive.DriveFile

  if (total <= SIMPLE_UPLOAD_LIMIT) {
    const request = RNFetchBlob.fetch('PUT', getUploadUrl(folder, fileName, 'content'), {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': contentType,
    }, RNFetchBlob.wrap(localPath))
    request.uploadProgress({ interval: 500 }, (uploaded) => {
      onProgress?.(uploaded, total)
    })
    item = parseGraphBlobResponse(await request) as LX.OneDrive.DriveFile
  } else {
    const uploadUrl = await createUploadSession(folder, fileName)
    let uploaded = 0
    while (uploaded < total) {
      const chunkSize = Math.min(UPLOAD_CHUNK_SIZE, total - uploaded)
      const chunk = await RNFS.read(localPath, chunkSize, uploaded, 'base64')
      const end = uploaded + chunkSize - 1
      const response = await RNFetchBlob.fetch('PUT', uploadUrl, {
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${uploaded}-${end}/${total}`,
        'Content-Type': 'application/octet-stream',
      }, chunk)
      const status = response.info().status
      if (status == 202) {
        uploaded += chunkSize
        onProgress?.(uploaded, total)
        continue
      }
      item = parseGraphBlobResponse(response) as LX.OneDrive.DriveFile
      uploaded = total
      onProgress?.(uploaded, total)
      break
    }
  }

  return {
    item: item!,
    remotePath: normalizePath(folder?.path, fileName),
  }
}