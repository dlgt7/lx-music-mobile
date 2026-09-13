import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import { formatPlayTime, sizeFormate } from '../../index'
import { allMusicList } from '@/utils/listManage'
import { updateListMusics } from '@/core/list'
import playerState from '@/store/player/state'

const fetchingDetails = new Set()

export const fetchAndApplyDetailedQuality = async(musicInfo, retryNum = 0) => {
  let latestMusicInfo = null
  for (const list of allMusicList.values()) {
    const found = list.find(item => item.id === musicInfo.id)
    if (found) {
      latestMusicInfo = found
      break
    }
  }
  const currentMusicInfo = latestMusicInfo || musicInfo
  if (currentMusicInfo.meta._full) return currentMusicInfo

  const songId = currentMusicInfo.meta.songId
  if (fetchingDetails.has(songId) && retryNum === 0) return currentMusicInfo
  if (retryNum === 0) fetchingDetails.add(songId)

  try {
    const requestObj = httpFetch(`https://music.163.com/api/song/music/detail/get?songId=${songId}`, {
      method: 'get',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
      },
    })
    const { body, statusCode } = await requestObj.promise

    if (statusCode !== 200 || !body || body.code !== 200) {
      throw new Error('Failed to get song quality information from API')
    }

    const data = body.data

    const newTypes = [...(musicInfo.meta.qualitys || [])]
    const new_Types = { ...(musicInfo.meta._qualitys || {}) }

    if (data.jm && data.jm.size && !new_Types.master) {
      const size = sizeFormate(data.jm.size)
      newTypes.push({ type: 'master', size })
      new_Types.master = { size }
    }
    if (data.db && data.db.size && !new_Types.atmos) {
      const size = sizeFormate(data.db.size)
      newTypes.push({ type: 'atmos', size })
      new_Types.atmos = { size }
    }
    if (data.db && data.db.size && !new_Types.atmos_plus) {
      const size = sizeFormate(data.db.size)
      newTypes.push({ type: 'atmos_plus', size })
      new_Types.atmos_plus = { size }
    }

    const updatedMusicInfo = {
      ...musicInfo,
      meta: {
        ...musicInfo.meta,
        qualitys: newTypes,
        _qualitys: new_Types,
        _full: true,
      },
    }

    const listIdsToUpdate = [];
    for (const [listId, list] of allMusicList.entries()) {
      if (list.some(item => item.id === musicInfo.id)) {
        listIdsToUpdate.push(listId);
      }
    }

    if (listIdsToUpdate.length) {
      void updateListMusics(listIdsToUpdate.map(id => ({ id, musicInfo: updatedMusicInfo })));
    } else {
      global.app_event.musicInfoUpdate(updatedMusicInfo);
    }

    if (playerState.playMusicInfo.musicInfo?.id === musicInfo.id) {
      playerState.playMusicInfo.musicInfo.meta = updatedMusicInfo.meta;
    }

    fetchingDetails.delete(songId)
    return updatedMusicInfo

  } catch (error) {
    if (++retryNum > 2) {
      console.error(`Failed to fetch details for ${musicInfo.name} after max retries:`, error)
      fetchingDetails.delete(songId)
      return { ...musicInfo, meta: { ...musicInfo.meta, _full: false } }
    }

    const delay = 200
    console.log(`Retrying fetch details for ${musicInfo.name} in ${delay}ms... (Attempt ${retryNum})`)
    await new Promise(resolve => setTimeout(resolve, delay))

    return fetchAndApplyDetailedQuality(musicInfo, retryNum)
  }
}

// https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/module/song_detail.js

export default {
  getSinger(singers) {
    let arr = []
    singers?.forEach(singer => {
      arr.push(singer.name)
    })
    return arr.join('、')
  },
  filterList({ songs, privileges }) {
    // console.log(songs, privileges)
    const list = []
    songs.forEach((item, index) => {
      const types = []
      const _types = {}
      let size
      let privilege = privileges[index]
      if (privilege.id !== item.id) privilege = privileges.find(p => p.id === item.id)
      if (!privilege) return

      if (privilege.maxBrLevel == 'hires') {
        size = item.hr ? sizeFormate(item.hr.size) : null
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = {
          size,
        }
      }
      switch (privilege.maxbr) {
        case 999000:
          size = item.sq ? sizeFormate(item.sq.size) : null
          types.push({ type: 'flac', size })
          _types.flac = {
            size,
          }
        case 320000:
          size = item.h ? sizeFormate(item.h.size) : null
          types.push({ type: '320k', size })
          _types['320k'] = {
            size,
          }
        case 192000:
        case 128000:
          size = item.l ? sizeFormate(item.l.size) : null
          types.push({ type: '128k', size })
          _types['128k'] = {
            size,
          }
      }

      types.reverse()

      if (item.pc) {
        list.push({
          singer: item.pc.ar ?? '',
          name: item.pc.sn ?? '',
          albumName: item.pc.alb ?? '',
          albumId: item.al?.id,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          songmid: item.id,
          img: item.al?.picUrl ?? '',
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      } else {
        list.push({
          singer: this.getSinger(item.ar),
          name: item.name ?? '',
          albumName: item.al?.name,
          albumId: item.al?.id,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          songmid: item.id,
          img: item.al?.picUrl,
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      }
    })
    // console.log(list)
    return list
  },
  async getList(ids = [], retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    const requestObj = httpFetch('https://music.163.com/weapi/v3/song/detail', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
      },
      form: weapi({
        c: '[' + ids.map(id => ('{"id":' + id + '}')).join(',') + ']',
        ids: '[' + ids.join(',') + ']',
      }),
    })
    const { body, statusCode } = await requestObj.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取歌曲详情失败')
    // console.log(body)
    return { source: 'wy', list: this.filterList(body) }
  },
}
