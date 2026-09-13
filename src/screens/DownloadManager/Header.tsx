import { memo, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/common/Icon';
import { pop } from '@/navigation';
import Text from '@/components/common/Text';
import OneDriveSetupModal, { type OneDriveSetupModalType } from '@/components/OneDriveSetupModal';
import { useStatusbarHeight } from '@/store/common/hook';
import { createStyle } from '@/utils/tools';
import { scaleSizeH } from '@/utils/pixelRatio';
import { HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant';

const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT);

export default memo(({ componentId }: { componentId: string }) => {
  const statusBarHeight = useStatusbarHeight();
  const oneDriveSetupModalRef = useRef<OneDriveSetupModalType>(null);
  const back = () => { void pop(componentId); };

  return (
    <View style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }}>
      <View style={styles.container}>
        <TouchableOpacity onPress={back} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} />
        </TouchableOpacity>
        <Text numberOfLines={1} size={16} style={styles.title}>下载管理</Text>
        <TouchableOpacity onPress={() => { oneDriveSetupModalRef.current?.show() }} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="setting" size={16} />
        </TouchableOpacity>
      </View>
      <OneDriveSetupModal ref={oneDriveSetupModalRef} />
    </View>
  );
});

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
