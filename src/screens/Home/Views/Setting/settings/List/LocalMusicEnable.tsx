import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'


import CheckBoxItem from '../../components/CheckBoxItem'

export default memo(() => {
  const t = useI18n()
  const enable = useSettingValue('localMusic.enable')
  const setEnable = (enable: boolean) => {
    updateSetting({ 'localMusic.enable': enable })
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem check={enable} onChange={setEnable} label={t('setting_local_music_enable')} />
    </View>
  )
})


const styles = createStyle({
  content: {
    marginTop: 5,
  },
})