package cn.toside.music.mobile.mediastore;

import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.provider.MediaStore;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MediaStoreModule extends ReactContextBaseJavaModule {
  private static final long MIN_AUDIO_BYTES = 1000L;
  private static final Set<String> AUDIO_EXTENSIONS = new HashSet<>(Arrays.asList(
    "mp3", "mp2", "flac", "ogg", "oga", "opus", "spx", "aac", "m4a", "m4b", "m4r", "m4p",
    "wav", "wave", "wma", "asf", "aiff", "aif", "aifc", "afc", "ape", "alac",
    "dsf", "dff", "dts", "dtshd", "wv", "tta", "mpc", "shn", "mka"
  ));
  private static final Set<String> VIDEO_EXTENSIONS = new HashSet<>(Arrays.asList("mp4", "m4b", "m4p"));

  private final ReactApplicationContext reactContext;

  MediaStoreModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "MediaStoreModule";
  }

  @ReactMethod
  public void queryAudioMediaStore(Promise promise) {
    try {
      WritableArray result = Arguments.createArray();
      Cursor cursor = reactContext.getContentResolver().query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        new String[]{
          MediaStore.Audio.Media._ID,
          MediaStore.Audio.Media.TITLE,
          MediaStore.Audio.Media.ARTIST,
          MediaStore.Audio.Media.ALBUM,
          MediaStore.Audio.Media.DURATION,
          MediaStore.Audio.Media.DATA,
          MediaStore.Audio.Media.SIZE,
          MediaStore.Audio.Media.MIME_TYPE,
        },
        null, null,
        MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC"
      );
      if (cursor != null) {
        while (cursor.moveToNext()) {
          String path = cursor.getString(5);
          long size = cursor.getLong(6);
          String mimeType = cursor.getString(7);
          String extension = getExtension(path);
          if (path == null || path.isEmpty()) continue;
          if (size < MIN_AUDIO_BYTES) continue;
          if (!AUDIO_EXTENSIONS.contains(extension)) continue;
          if (mimeType != null && mimeType.startsWith("video/")) continue;
          if (VIDEO_EXTENSIONS.contains(extension) && hasVideoTrack(path)) continue;
          WritableMap item = Arguments.createMap();
          item.putString("path", path);
          item.putString("title", cursor.getString(1));
          item.putString("artist", cursor.getString(2));
          item.putString("album", cursor.getString(3));
          item.putDouble("duration", cursor.getLong(4) / 1000.0);
          item.putDouble("size", size);
          item.putString("mimeType", mimeType);
          result.pushMap(item);
        }
        cursor.close();
      }
      promise.resolve(result);
    } catch (Exception error) {
      promise.reject("QUERY_FAILED", error.getMessage(), error);
    }
  }

  @ReactMethod
  public void scanFolderRecursive(String dirPath, Promise promise) {
    try {
      WritableArray result = Arguments.createArray();
      File root = new File(dirPath);
      Deque<File> stack = new ArrayDeque<>();
      if (root.exists() && root.isDirectory()) stack.push(root);
      while (!stack.isEmpty()) {
        File current = stack.pop();
        File[] children = current.listFiles();
        if (children == null) continue;
        for (File child : children) {
          if (child.isDirectory()) {
            stack.push(child);
          } else if (child.length() >= MIN_AUDIO_BYTES && AUDIO_EXTENSIONS.contains(getExtension(child.getName()))) {
            result.pushString(child.getAbsolutePath());
          }
        }
      }
      promise.resolve(result);
    } catch (Exception error) {
      promise.reject("SCAN_FAILED", error.getMessage(), error);
    }
  }

  private String getExtension(String name) {
    if (name == null) return "";
    int index = name.lastIndexOf('.');
    if (index < 0 || index == name.length() - 1) return "";
    return name.substring(index + 1).toLowerCase(Locale.ROOT);
  }

  private boolean hasVideoTrack(String path) {
    MediaMetadataRetriever retriever = new MediaMetadataRetriever();
    try {
      retriever.setDataSource(path);
      String hasVideo = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO);
      return hasVideo != null;
    } catch (Exception error) {
      return false;
    } finally {
      try {
        retriever.release();
      } catch (Exception ignored) {}
    }
  }
}