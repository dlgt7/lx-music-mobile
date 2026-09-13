import { View } from 'react-native'
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import CheckBox from '@/components/common/CheckBox'
import { addTask as addDownloadTask } from '@/core/download';
import {fetchAndApplyDetailedQuality} from "@/utils/musicSdk/wy/musicDetail.js";
import { useSettingValue } from '@/store/setting/hook'

interface TitleType {
  updateTitle: (musicInfo: LX.Music.MusicInfo) => void
}
const Title = forwardRef<TitleType, {}>((props, ref) => {
  const [title, setTitle] = useState('')
  useImperativeHandle(ref, () => ({
    updateTitle(musicInfo) {
      setTitle(
        global.i18n.t('download_music_title', { name: musicInfo.name, artist: musicInfo.singer })
      )
    },
  }))

  return <Text style={{ marginBottom: 5 }}>{title}</Text>
})

export interface MusicDownloadModalProps {
  onDownloadInfo: (info: LX.Music.MusicInfo) => void
}

export interface MusicDownloadModalType {
  show: (info: LX.Music.MusicInfo) => void
}


export default forwardRef<MusicDownloadModalType, MusicDownloadModalProps>(
  ({ onDownloadInfo }, ref) => {
    const alertRef = useRef<ConfirmAlertType>(null)
    const titleRef = useRef<TitleType>(null)
    const selectedInfo = useRef<LX.Music.MusicInfo>({} as LX.Music.MusicInfo)
    const [selectedQuality, setSelectedQuality] = useState<LX.Quality>('128k')
    const [selectedTarget, setSelectedTarget] = useState<'local' | 'onedrive'>('local')
    const [playQualityList, setPlayQualityList] = useState<MusicOption[]>([])
    const [visible, setVisible] = useState(false)
    const showOneDriveDownload = useSettingValue('menu.downloadOneDrive')

    interface QualityMap {
      [key: string]: MusicOption
    }

    const calcQualitys = (musicInfo: LX.Music.MusicInfo) => {
      const map = new Map()

      map.set('128k', global.i18n.t('128k'))
      map.set('320k', global.i18n.t('320k'))
      map.set('192k', global.i18n.t('192k'))
      map.set('flac', global.i18n.t('flac'))
      map.set('flac24bit', global.i18n.t('flac24bit'))
      map.set('hires', global.i18n.t('hires'))
      map.set('atmos', global.i18n.t('atmos'))
      map.set('atmos_plus', global.i18n.t('atmos_plus'))
      map.set('master', global.i18n.t('master'))
      map.set('ape', global.i18n.t('ape'))
      map.set('wav', global.i18n.t('wav'))

      // @ts-ignore
      const qualitys = musicInfo.meta.qualitys

      const qualityMap: QualityMap = {}
      for (const element of qualitys) {
        const temp: MusicOption = {
          id: element.type,
          name: map.has(element.type) ? map.get(element.type) : '未知',
          size: element.size,
          key: element.type,
        }
        qualityMap[element.type] = temp
      }
      setPlayQualityList(Object.values(qualityMap))
    }

    useEffect(() => {
      if (visible && playQualityList.length) {
        setSelectedQuality(playQualityList[0].id)
      }
    }, [visible, playQualityList])

    useImperativeHandle(ref, () => ({
      async show(info) {
        selectedInfo.current = info
        titleRef.current?.updateTitle(info)
        calcQualitys(info)

        if (visible) {
          alertRef.current?.setVisible(true)
        } else {
          setVisible(true)
        }

        if (info.source === 'wy' && !info.meta._full) {
          const detailedInfo = await fetchAndApplyDetailedQuality(info as LX.Music.MusicInfoOnline);

          if (detailedInfo.meta._full) {
            selectedInfo.current = detailedInfo;
            calcQualitys(detailedInfo);
          }
        }
      },
    }))

    useEffect(() => {
      if (visible) {
        alertRef.current?.setVisible(true)
      }
    }, [visible])

    const handleDownloadMusic = async() => {
      const target = showOneDriveDownload && selectedTarget === 'onedrive' ? 'onedrive' : 'local'
      alertRef.current?.setVisible(false)
      addDownloadTask(
        selectedInfo.current,
        selectedQuality,
        false,
        target
      );
      setTimeout(() => {
        setSelectedQuality('128k')
        setSelectedTarget('local')
      }, 300)
    }

    interface MusicOption {
      id: LX.Quality
      name: string
      size?: string | null
      key?: string
    }

    const useActive = (id: LX.Quality) => {
      return useMemo(() => selectedQuality === id, [selectedQuality, id])
    }

    const Item = ({ id, name }: { id: LX.Quality; name: string }) => {
      const isActive = useActive(id)
      return (
        <CheckBox
          marginRight={8}
          check={isActive}
          label={name}
          onChange={() => {
            setSelectedQuality(id)
          }}
          need
        />
      )
    }

    return visible ? (
      <ConfirmAlert
        ref={alertRef}
        onConfirm={handleDownloadMusic}
        onHide={() => setVisible(false) }
      >
        <View style={styles.content}>
          <Title ref={titleRef} />
          {showOneDriveDownload ? (
            <View style={styles.targetList}>
              <CheckBox
                marginRight={8}
                check={selectedTarget === 'local'}
                label="下载到本地"
                onChange={() => setSelectedTarget('local')}
                need
              />
              <CheckBox
                marginRight={8}
                check={selectedTarget === 'onedrive'}
                label="下载到 OneDrive"
                onChange={() => setSelectedTarget('onedrive')}
                need
              />
            </View>
          ) : null}
          <View style={styles.list}>
            {playQualityList.map((item) => (
              <Item name={item.name + (item.size ? ` (${item.size})` : '')} id={item.id} key={item.key} />
            ))}
          </View>
        </View>
      </ConfirmAlert>
    ) : null
  }
)

const styles = createStyle({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'column',
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 260,
    borderRadius: 4,
  },
  list: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  targetList: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    marginBottom: 8,
  },
})