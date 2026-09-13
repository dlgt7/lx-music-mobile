import { View } from 'react-native'
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import CheckBox from '@/components/common/CheckBox'
import { addTask as addDownloadTask } from '@/core/download'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'

interface TitleType {
  updateTitle: (musicInfo: LX.Music.MusicInfo) => void
}
const Title = forwardRef<TitleType, {}>((_props, ref) => {
  const [title, setTitle] = useState('')
  useImperativeHandle(ref, () => ({
    updateTitle(musicInfo) {
      setTitle(
        global.i18n.t('download_music_title', { name: musicInfo.name, artist: musicInfo.singer })
      )
    },
  }))

  return <Text style={styles.title}>{title}</Text>
})

export interface MusicDownloadModalProps {
  onDownloadInfo?: (info: LX.Music.MusicInfo) => void
}

export interface MusicDownloadModalType {
  show: (info: LX.Music.MusicInfo) => void
}


const DOWNLOAD_QUALITY_LIST: LX.Quality[] = ['128k', '320k', 'flac']

const QualityItem = ({ id, name, isActive, onSelect }: {
  id: LX.Quality
  name: string
  isActive: boolean
  onSelect: (id: LX.Quality) => void
}) => {
  return (
    <CheckBox
      marginRight={8}
      check={isActive}
      label={name}
      onChange={() => onSelect(id)}
      need
    />
  )
}

export default forwardRef<MusicDownloadModalType, MusicDownloadModalProps>(
  ({ onDownloadInfo }, ref) => {
    const t = useI18n()
    const alertRef = useRef<ConfirmAlertType>(null)
    const titleRef = useRef<TitleType>(null)
    const selectedInfo = useRef<LX.Music.MusicInfo>({} as LX.Music.MusicInfo)
    const [selectedQuality, setSelectedQuality] = useState<LX.Quality>('128k')
    const [selectedTarget, setSelectedTarget] = useState<'local' | 'onedrive'>('local')
    const [visible, setVisible] = useState(false)
    const showOneDriveDownload = useSettingValue('menu.downloadOneDrive')

    useEffect(() => {
      if (visible) {
        setSelectedQuality('128k')
        setSelectedTarget('local')
      }
    }, [visible])

    useImperativeHandle(ref, () => ({
      show(info) {
        selectedInfo.current = info
        titleRef.current?.updateTitle(info)

        if (visible) {
          alertRef.current?.setVisible(true)
        } else {
          setVisible(true)
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
      )
      onDownloadInfo?.(selectedInfo.current)
    }

    const qualityItems = useMemo(() => {
      return DOWNLOAD_QUALITY_LIST.map(quality => (
        <QualityItem
          key={quality}
          id={quality}
          name={t(quality)}
          isActive={selectedQuality === quality}
          onSelect={setSelectedQuality}
        />
      ))
    }, [t, selectedQuality])

    return visible ? (
      <ConfirmAlert
        ref={alertRef}
        onConfirm={handleDownloadMusic}
        onHide={() => setVisible(false)}
      >
        <View style={styles.content}>
          <Title ref={titleRef} />
          <View style={styles.targetList}>
            <CheckBox
              marginRight={8}
              check={selectedTarget === 'local'}
              label={t('download_to_local')}
              onChange={() => setSelectedTarget('local')}
              need
            />
            {showOneDriveDownload ? (
              <CheckBox
                marginRight={8}
                check={selectedTarget === 'onedrive'}
                label={t('download_to_onedrive')}
                onChange={() => setSelectedTarget('onedrive')}
                need
              />
            ) : null}
          </View>
          <View style={styles.list}>
            {qualityItems}
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
  title: {
    marginBottom: 5,
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
