import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const autoScan = useSettingValue('localMusic.autoScan')
  const setAutoScan = (autoScan: boolean) => {
    updateSetting({ 'localMusic.autoScan': autoScan })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={autoScan} onChange={setAutoScan} label={t('setting_local_music_auto_scan')} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})