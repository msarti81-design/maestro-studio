import os
import xml.etree.ElementTree as ET

def configure_manifest():
    manifest_path = 'android/app/src/main/AndroidManifest.xml'
    if not os.path.exists(manifest_path):
        print("AndroidManifest.xml not found, skipping manifest configuration")
        return
    
    ET.register_namespace('android', 'http://schemas.android.com/apk/res/android')
    tree = ET.parse(manifest_path)
    root = tree.getroot()
    android_ns = '{http://schemas.android.com/apk/res/android}'
    
    # 1. Add missing Android Permissions for Audio Recording (Mic) & External Storage (Downloads)
    required_permissions = [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
    ]

    existing_permissions = set()
    for perm in root.findall('uses-permission'):
        name = perm.get(f'{android_ns}name')
        if name:
            existing_permissions.add(name)

    for perm_name in required_permissions:
        if perm_name not in existing_permissions:
            perm_elem = ET.Element('uses-permission')
            perm_elem.set(f'{android_ns}name', perm_name)
            if "EXTERNAL_STORAGE" in perm_name:
                perm_elem.set(f'{android_ns}maxSdkVersion', '32')
            root.insert(0, perm_elem)

    # 2. Activity Configuration
    for activity in root.findall('.//activity'):
        activity.set(f'{android_ns}screenOrientation', 'sensorLandscape')
        activity.set(f'{android_ns}configChanges', 'orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode')
        activity.set(f'{android_ns}theme', '@style/AppTheme.NoActionBarFullscreen')
    
    tree.write(manifest_path, encoding='utf-8', xml_declaration=True)
    print("Successfully configured AndroidManifest.xml with Mic & Storage Permissions!")

def configure_styles():
    styles_content = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#020617</item>
        <item name="colorPrimaryDark">#020617</item>
        <item name="colorAccent">#f59e0b</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:windowTranslucentStatus">true</item>
        <item name="android:windowTranslucentNavigation">true</item>
        <item name="android:statusBarColor">#00000000</item>
        <item name="android:navigationBarColor">#00000000</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">#020617</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:windowTranslucentStatus">true</item>
        <item name="android:windowTranslucentNavigation">true</item>
        <item name="android:statusBarColor">#00000000</item>
        <item name="android:navigationBarColor">#00000000</item>
    </style>

    <style name="AppTheme.NoActionBarFullscreen" parent="AppTheme.NoActionBar">
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:windowTranslucentStatus">true</item>
        <item name="android:windowTranslucentNavigation">true</item>
        <item name="android:statusBarColor">#00000000</item>
        <item name="android:navigationBarColor">#00000000</item>
    </style>
</resources>
"""
    for root_dir, dirs, files in os.walk('android/app/src/main/res'):
        for file in files:
            if file == 'styles.xml':
                styles_path = os.path.join(root_dir, file)
                try:
                    with open(styles_path, 'w', encoding='utf-8') as f:
                        f.write(styles_content)
                    print(f"Successfully configured styles.xml in {styles_path}")
                except Exception as e:
                    print("Styles config error:", e)

def configure_main_activity():
    main_act_path = None
    package_name = "com.maestrostudio.piano"
    
    for root, dirs, files in os.walk('android/app/src/main/java'):
        for file in files:
            if file == 'MainActivity.java':
                main_act_path = os.path.join(root, file)
                break
        if main_act_path:
            break
            
    if not main_act_path or not os.path.exists(main_act_path):
        print("MainActivity.java not found, skipping MainActivity customization")
        return

    template = r"""package {package_name};

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableStickyImmersiveMode();
        requestAudioAndStoragePermissions();
        setupWebViewDownloadAndAudioHandler();
    }

    private void requestAudioAndStoragePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = {
                android.Manifest.permission.RECORD_AUDIO,
                android.Manifest.permission.MODIFY_AUDIO_SETTINGS,
                android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
                android.Manifest.permission.READ_EXTERNAL_STORAGE
            };
            boolean needsRequest = false;
            for (String p : permissions) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    needsRequest = true;
                    break;
                }
            }
            if (needsRequest) {
                ActivityCompat.requestPermissions(this, permissions, 1001);
            }
        }
    }

    public class AndroidFileSaver {
        @JavascriptInterface
        public void saveFileToDownloads(String fileName, String base64Data, String mimeType) {
            try {
                if (fileName == null || fileName.isEmpty()) fileName = "spartito_export.mid";
                byte[] fileData = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType != null ? mimeType : "application/octet-stream");
                    values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS);

                    android.net.Uri uri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        java.io.OutputStream out = getContentResolver().openOutputStream(uri);
                        if (out != null) {
                            out.write(fileData);
                            out.close();
                        }
                    }
                } else {
                    java.io.File downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                    if (!downloadsDir.exists()) downloadsDir.mkdirs();
                    java.io.File file = new java.io.File(downloadsDir, fileName);
                    java.io.FileOutputStream out = new java.io.FileOutputStream(file);
                    out.write(fileData);
                    out.close();

                    android.media.MediaScannerConnection.scanFile(getApplicationContext(), new String[]{file.getAbsolutePath()}, null, null);
                }

                final String finalName = fileName;
                runOnUiThread(() -> {
                    Toast.makeText(getApplicationContext(), "✓ File " + finalName + " salvato in Download!", Toast.LENGTH_LONG).show();
                });
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    Toast.makeText(getApplicationContext(), "Errore salvataggio: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }
        }
    }

    private void setupWebViewDownloadAndAudioHandler() {
        if (bridge != null && bridge.getWebView() != null) {
            android.webkit.WebView webView = bridge.getWebView();
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setDomStorageEnabled(true);
            
            // Register JavascriptInterface for instant direct file saves
            webView.addJavascriptInterface(new AndroidFileSaver(), "AndroidFileSaver");

            // 1. Grant WebView permission for microphone input automatically
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }
            });

            // 2. Handle WebView file download triggers (JSON & MIDI data/blob URLs)
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        String fileName = "spartito_export";
                        if (contentDisposition != null && contentDisposition.contains("filename=")) {
                            fileName = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9)
                                .replace("\"", "").replace(";", "").trim();
                        } else if (url.contains(".mid") || (mimetype != null && mimetype.contains("midi"))) {
                            fileName = "spartito_maestro.mid";
                        } else if (url.contains(".json") || (mimetype != null && mimetype.contains("json"))) {
                            fileName = "spartito_maestro.json";
                        }

                        if (url != null && url.startsWith("data:")) {
                            int commaIdx = url.indexOf(",");
                            if (commaIdx != -1) {
                                String base64Data = url.substring(commaIdx + 1);
                                new AndroidFileSaver().saveFileToDownloads(fileName, base64Data, mimetype != null ? mimetype : "application/octet-stream");
                                return;
                            }
                        }

                        if (url != null && url.startsWith("blob:")) {
                            // Extract blob content via JavaScript bridge
                            String js = "(function() { " +
                                "fetch('" + url + "').then(r => r.blob()).then(b => { " +
                                "  var reader = new FileReader(); " +
                                "  reader.onload = function() { " +
                                "    if (window.AndroidFileSaver) { " +
                                "      window.AndroidFileSaver.saveFileToDownloads('" + fileName + "', reader.result.split(',')[1], b.type || 'application/octet-stream'); " +
                                "    } " +
                                "  }; " +
                                "  reader.readAsDataURL(b); " +
                                "}); " +
                                "})();";
                            webView.post(() -> webView.evaluateJavascript(js, null));
                            return;
                        }

                        // Fallback for http/https standard links
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setData(Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(getApplicationContext(), "Errore download file", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableStickyImmersiveMode();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        enableStickyImmersiveMode();
    }

    @Override
    public void onStart() {
        super.onStart();
        enableStickyImmersiveMode();
    }

    private void enableStickyImmersiveMode() {
        Window window = getWindow();
        if (window == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        WindowCompat.setDecorFitsSystemWindows(window, false);

        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        View decorView = window.getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}
"""
    full_main_activity = template.replace("{package_name}", package_name)
    with open(main_act_path, 'w', encoding='utf-8') as f:
        f.write(full_main_activity)
    print("Successfully configured MainActivity.java with Sticky Immersive, Mic Permissions & AndroidFileSaver Bridge!")

if __name__ == '__main__':
    configure_manifest()
    configure_styles()
    configure_main_activity()
