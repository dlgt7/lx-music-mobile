import { memo, useCallback, useEffect, useRef } from 'react'
import { View, TouchableOpacity, FlatList, type FlatListProps } from 'react-native'
import PageContent from '@/components/PageContent'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'

import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { useStatusbarHeight } from '@/store/common/hook'
import { pop } from '@/navigation'
import { HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant'
import { useLocalMusics, useLocalMusicScanState, useLocalMusicScanProgress } from '@/store/localMusic/hook'
import { scanLocalMusic } from '@/core/localMusic'
import { listMusicOverwrite } from '@/utils/listManage'
import { playList } from '@/core/player/player'


const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)
const LOCAL_MUSIC_LIST_ID = 'local_music'

type FlatListType = FlatListProps<LX.Music.MusicInfoLocal>

const ListItem = memo(({ item, index, activeId, onPress }: {
  item: LX.Music.MusicInfoLocal
  index: number
  activeId: string
  onPress: (item: LX.Music.MusicInfoLocal, index: number) => void
}) => {
  const theme = useTheme()
  const active = activeId == item.id
  return (
    <TouchableOpacity style={{ ...styles.item, borderBottomColor: theme['c-border-background'] }} onPress={() => onPress(item, index)}>
      <Text style={styles.sn} size={13} color={theme['c-300']}>{index + 1}</Text>
      <View style={styles.info}>
        <Text size={15} numberOfLines={1} color={active ? theme['c-primary-font'] : theme['c-font']}>{item.name}</Text>
        <Text style={styles.sub} size={11} color={theme['c-font-label']} numberOfLines={1}>{item.singer || '未知歌手'}{item.interval ? ` · ${item.interval}` : ''}</Text>
      </View>
    </TouchableOpacity>
  )
}, (prev, next) => prev.item === next.item && prev.index === next.index && prev.activeId === next.activeId)

const Header = ({ componentId, onScan, isScanning }: { componentId: string, onScan: () => void, isScanning: boolean }) => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const back = () => { void pop(componentId) }
  return (
    <View style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={back} style={{ ...styles.headerButton, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} color={theme['c-font']} />
        </TouchableOpacity>
        <Text numberOfLines={1} size={16} style={styles.headerTitle}>本地音乐</Text>
        <TouchableOpacity onPress={onScan} disabled={isScanning} style={{ ...styles.headerButton, width: HEADER_HEIGHT }}>
          <Icon name="search-2" size={16} color={isScanning ? theme['c-font-label'] : theme['c-font']} />
        </TouchableOpacity>
      </View>
    </View>
  )
}


export default memo(({ componentId }: { componentId: string }) => {
  const musics = useLocalMusics()
  const isScanning = useLocalMusicScanState()
  const scanProgress = useLocalMusicScanProgress()
  const theme = useTheme()

  const activeIdRef = useRef('')
  const activeId = activeIdRef.current

  useEffect(() => {
    if (musics.length === 0 && !isScanning) {
      void scanLocalMusic()
    }
  }, [])

  const handleScan = useCallback(() => {
    void scanLocalMusic()
  }, [])

  const handlePlay = useCallback((item: LX.Music.MusicInfoLocal, index: number) => {
    activeIdRef.current = item.id
    void listMusicOverwrite(LOCAL_MUSIC_LIST_ID, musics).then(() => {
      void playList(LOCAL_MUSIC_LIST_ID, index)
    })
  }, [musics])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem item={item} index={index} activeId={activeId} onPress={handlePlay} />
  )

  const progressText = isScanning && scanProgress.total > 0
    ? `扫描中 ${scanProgress.current}/${scanProgress.total}`
    : isScanning ? '扫描中...' : ''

  return (
    <PageContent>
      <View style={styles.container}>
        <Header componentId={componentId} onScan={handleScan} isScanning={isScanning} />
        {progressText ? (
          <View style={styles.progressWrap}>
            <Text size={12} color={theme['c-font-label']}>{progressText}</Text>
          </View>
        ) : null}
        <FlatList
          data={musics}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.empty}>{isScanning ? '正在扫描本地音乐...' : '暂无本地音乐，点击右上角刷新扫描'}</Text>}
          removeClippedSubviews={true}
        />
      </View>
    </PageContent>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  headerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  progressWrap: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sn: {
    width: 38,
    textAlign: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  sub: {
    marginTop: 2,
  },
  empty: {
    padding: 24,
    textAlign: 'center',
  },
})