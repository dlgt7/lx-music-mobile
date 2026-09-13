import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { batchDownload } from '@/core/download'

export interface BatchDownloadModalType {
  show: (list: LX.Music.MusicInfo[]) => void
}

const qualityIds: LX.Quality[] = [
  '128k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master',
]

export default forwardRef<BatchDownloadModalType, { onConfirm?: () => void }>(
  ({ onConfirm }, ref) => {
    const alertRef = useRef<ConfirmAlertType>(null)
    const selectedListRef = useRef<LX.Music.MusicInfo[]>([])
    const showOneDriveDownload = useSettingValue('menu.downloadOneDrive')
    const t = useI18n()
    const [visible, setVisible] = useState(false)
    const [selectedQuality, setSelectedQuality] = useState<LX.Quality>('128k')
    const [selectedTarget, setSelectedTarget] = useState<'local' | 'onedrive'>('local')

    useImperativeHandle(ref, () => ({
      show(list) {
        selectedListRef.current = list
        setSelectedTarget('local')
        if (visible) alertRef.current?.setVisible(true)
        else setVisible(true)
      },
    }))

    useEffect(() => {
      if (visible) alertRef.current?.setVisible(true)
    }, [visible])

    const title = useMemo(() => {
      return `批量下载 ${selectedListRef.current.length} 首歌曲`
    }, [visible])

    const handleConfirm = async() => {
      const target = showOneDriveDownload && selectedTarget === 'onedrive' ? 'onedrive' : 'local'
      alertRef.current?.setVisible(false)
      void batchDownload(
        selectedListRef.current,
        selectedQuality,
        target
      )
      onConfirm?.()
    }

    return visible ? (
      <ConfirmAlert
        ref={alertRef}
        onConfirm={handleConfirm}
        onHide={() => setVisible(false)}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {showOneDriveDownload ? (
            <View style={styles.group}>
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
          <View style={styles.group}>
            {qualityIds.map(id => (
              <CheckBox
                key={id}
                marginRight={8}
                check={selectedQuality === id}
                label={t(id)}
                onChange={() => setSelectedQuality(id)}
                need
              />
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
  title: {
    marginBottom: 8,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
})