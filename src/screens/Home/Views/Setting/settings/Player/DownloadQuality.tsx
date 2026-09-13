import { memo, useMemo } from 'react'

import { StyleSheet, View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'

const useActive = (id: LX.Quality) => {
  const quality = useSettingValue('download.quality')
  return useMemo(() => quality == id, [quality, id])
}

const Item = ({ id, name }: { id: LX.Quality, name: string }) => {
  const isActive = useActive(id)
  return <CheckBox marginRight={8} check={isActive} label={name} onChange={() => { updateSetting({ 'download.quality': id }) }} need />
}

export default memo(() => {
  const t = useI18n()
  const qualityList = useMemo(() => ['flac24bit', 'flac', '320k', '128k'] as LX.Quality[], [])

  return (
    <SubTitle title={t('setting_download_quality')}>
      <View style={styles.list}>
        {qualityList.map(quality => <Item name={t(quality)} id={quality} key={quality} />)}
      </View>
    </SubTitle>
  )
})

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
