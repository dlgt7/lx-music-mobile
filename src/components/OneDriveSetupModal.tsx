import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Keyboard, ScrollView, TextInput, TouchableOpacity, View } from 'react-native'
import ConfirmAlert, { type ConfirmAlertType } from '@/components/common/ConfirmAlert'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle, openUrl, toast } from '@/utils/tools'
import {
  clearOneDriveAuth,
  createOneDriveDeviceCode,
  getOneDriveAuth,
  pollOneDriveDeviceCode,
} from '@/core/oneDrive/auth'
import {
  getOneDriveConfig,
  getOneDriveDownloadFolder,
  listOneDriveFolders,
  saveOneDriveDownloadFolder,
} from '@/core/oneDrive/drive'

export interface OneDriveSetupModalType {
  show: () => void
}

const getFolderName = (folder?: LX.OneDrive.DriveFolder | null) => folder?.path || 'OneDrive 根目录'

const formatTime = (time?: number) => {
  if (!time) return ''
  return new Date(time).toLocaleString()
}

export default forwardRef<OneDriveSetupModalType, {}>((_, ref) => {
  const alertRef = useRef<ConfirmAlertType>(null)
  const theme = useTheme()
  const [visible, setVisible] = useState(false)
  const [clientId, setClientId] = useState('')
  const [authInfo, setAuthInfo] = useState<LX.OneDrive.AuthInfo | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<LX.OneDrive.DeviceCodeInfo | null>(null)
  const [statusText, setStatusText] = useState('')
  const [loading, setLoading] = useState(false)
  const [folderStack, setFolderStack] = useState<LX.OneDrive.DriveFolder[]>([])
  const [folders, setFolders] = useState<LX.OneDrive.DriveFolder[]>([])
  const [folderLoading, setFolderLoading] = useState(false)
  const [downloadFolder, setDownloadFolder] = useState<LX.OneDrive.DriveFolder | null>(null)

  const currentFolder = folderStack.at(-1) ?? null

  const accountName =
    authInfo?.account?.displayName ||
    authInfo?.account?.mail ||
    authInfo?.account?.userPrincipalName ||
    ''

  const loadConfig = useCallback(() => {
    void Promise.all([getOneDriveAuth(), getOneDriveConfig()]).then(([auth, config]) => {
      setAuthInfo(auth)
      setClientId(auth?.clientId ?? '')
      setDownloadFolder(getOneDriveDownloadFolder(config))
    })
  }, [])

  const loadFolders = useCallback((folder: LX.OneDrive.DriveFolder | null) => {
    setFolderLoading(true)
    void listOneDriveFolders(folder)
      .then(setFolders)
      .catch((err: any) => {
        toast(err.message ?? String(err), 'long')
      })
      .finally(() => {
        setFolderLoading(false)
      })
  }, [])

  useImperativeHandle(ref, () => ({
    show() {
      loadConfig()
      if (visible) alertRef.current?.setVisible(true)
      else setVisible(true)
    },
  }))

  useEffect(() => {
    if (visible) alertRef.current?.setVisible(true)
  }, [visible])

  useEffect(() => {
    if (!visible || !authInfo) return
    loadFolders(currentFolder)
  }, [visible, authInfo, currentFolder, loadFolders])

  const handleDeviceLogin = useCallback(() => {
    Keyboard.dismiss()
    setLoading(true)
    setStatusText('正在生成设备码...')
    void createOneDriveDeviceCode(clientId)
      .then(async (info) => {
        setDeviceInfo(info)
        setStatusText('请在浏览器完成授权，App 会自动等待登录结果。')
        void openUrl(info.verificationUriComplete ?? info.verificationUri)
        return pollOneDriveDeviceCode(info)
      })
      .then((info) => {
        setAuthInfo(info)
        setDeviceInfo(null)
        setStatusText('')
        toast('OneDrive 登录成功')
      })
      .catch((err: any) => {
        const message = err.message ?? String(err)
        setStatusText(message)
        toast(message, 'long')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [clientId])

  const handleLogout = useCallback(() => {
    setLoading(true)
    void clearOneDriveAuth()
      .then(() => {
        setAuthInfo(null)
        setDeviceInfo(null)
        setStatusText('')
        setFolders([])
        setFolderStack([])
        toast('OneDrive 登录信息已清除')
      })
      .catch((err: any) => {
        toast(err.message ?? String(err), 'long')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSelectDownloadFolder = useCallback(() => {
    setLoading(true)
    void saveOneDriveDownloadFolder(currentFolder)
      .then((config) => {
        const folder = getOneDriveDownloadFolder(config)
        setDownloadFolder(folder)
        toast(`OneDrive 下载目录：${getFolderName(folder)}`)
      })
      .catch((err: any) => {
        toast(err.message ?? String(err), 'long')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [currentFolder])

  return visible ? (
    <ConfirmAlert
      ref={alertRef}
      showConfirm={false}
      onHide={() => setVisible(false)}
    >
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>OneDrive 设置</Text>

        <View style={{ ...styles.panel, borderColor: theme['c-border-background'] }}>
          <Text style={styles.label}>登录状态</Text>
          <Text color={authInfo ? theme['c-primary-font'] : theme['c-font-label']}>
            {authInfo ? `已登录${accountName ? `：${accountName}` : ''}` : '未登录'}
          </Text>
          {authInfo ? (
            <Text style={styles.tip} size={10} color={theme['c-font-label']}>
              Token 过期时间：{formatTime(authInfo.expiresAt)}
            </Text>
          ) : null}
        </View>

        <View style={{ ...styles.panel, borderColor: theme['c-border-background'] }}>
          <Text style={styles.label}>Microsoft 应用 Client ID</Text>
          <TextInput
            value={clientId}
            editable={!loading}
            placeholder="client_id"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setClientId}
            placeholderTextColor={theme['c-font-label']}
            selectionColor={theme['c-primary-light-100-alpha-300']}
            style={{
              ...styles.input,
              borderColor: theme['c-border-background'],
              color: theme['c-font'],
            }}
          />
          <Text style={styles.tip} size={10} color={theme['c-font-label']}>
            权限：Files.ReadWrite、User.Read、offline_access。在 Azure Portal 应用注册中创建应用并允许公共客户端流后，将客户端 ID 填入此处。
          </Text>
          {deviceInfo ? (
            <View style={styles.deviceInfo}>
              <Text style={styles.tip} size={11} color={theme['c-font']}>
                设备码：{deviceInfo.userCode}
              </Text>
              <TouchableOpacity onPress={() => { void openUrl(deviceInfo.verificationUriComplete ?? deviceInfo.verificationUri) }}>
                <Text size={11} color={theme['c-primary-font']}>打开验证页面：{deviceInfo.verificationUri}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {statusText ? (
            <Text style={styles.tip} size={11} color={theme['c-font-label']}>{statusText}</Text>
          ) : null}
          <View style={styles.buttonRow}>
            <Button
              style={{ ...styles.button, backgroundColor: theme['c-button-background'] }}
              disabled={loading || !clientId.trim()}
              onPress={handleDeviceLogin}
            >
              <Text color={theme['c-button-font']}>设备码登录</Text>
            </Button>
            <Button
              style={{ ...styles.button, backgroundColor: theme['c-button-background'] }}
              disabled={loading || !authInfo}
              onPress={handleLogout}
            >
              <Text color={theme['c-button-font']}>退出登录</Text>
            </Button>
          </View>
        </View>

        <View style={{ ...styles.panel, borderColor: theme['c-border-background'] }}>
          <Text style={styles.label}>下载目录</Text>
          <Text size={11} color={theme['c-font-label']}>当前：{getFolderName(downloadFolder)}</Text>
          {!authInfo ? (
            <Text style={styles.tip} size={10} color={theme['c-font-label']}>登录后可选择下载目录</Text>
          ) : (
            <>
              <View style={styles.folderNav}>
                <TouchableOpacity
                  disabled={!folderStack.length || folderLoading}
                  onPress={() => { setFolderStack(stack => stack.slice(0, -1)) }}
                  style={styles.folderBackBtn}
                >
                  <Icon name="chevron-left" size={14} color={folderStack.length ? theme['c-font'] : theme['c-font-label']} />
                  <Text size={11} color={folderStack.length ? theme['c-font'] : theme['c-font-label']}>返回上级</Text>
                </TouchableOpacity>
                <Text style={styles.folderPath} size={11} color={theme['c-font-label']} numberOfLines={1}>
                  {getFolderName(currentFolder)}
                </Text>
              </View>
              {folderLoading ? (
                <Text style={styles.tip} size={11} color={theme['c-font-label']}>加载中...</Text>
              ) : (
                folders.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.folderItem}
                    onPress={() => { setFolderStack(stack => [...stack, item]) }}
                  >
                    <Text size={12} numberOfLines={1}>{item.name}</Text>
                    <Icon name="chevron-right" size={10} color={theme['c-font-label']} />
                  </TouchableOpacity>
                ))
              )}
              <View style={styles.buttonRow}>
                <Button
                  style={{ ...styles.button, backgroundColor: theme['c-button-background'] }}
                  disabled={loading}
                  onPress={handleSelectDownloadFolder}
                >
                  <Text color={theme['c-button-font']}>设为下载目录</Text>
                </Button>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ConfirmAlert>
  ) : null
})

const styles = createStyle({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 420,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  tip: {
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
  },
  deviceInfo: {
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  button: {
    flex: 1,
    height: 34,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  folderBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  folderPath: {
    flex: 1,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
})