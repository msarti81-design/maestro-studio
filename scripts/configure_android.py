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

    # 2. Activity & Application Configuration
    app_elem = root.find('application')
    if app_elem is not None:
        app_elem.set(f'{android_ns}usesCleartextTraffic', 'true')

    for activity in root.findall('.//activity'):
        activity.set(f'{android_ns}screenOrientation', 'sensorLandscape')
        activity.set(f'{android_ns}configChanges', 'orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode')
        activity.set(f'{android_ns}theme', '@style/AppTheme.NoActionBarFullscreen')
    
    tree.write(manifest_path, encoding='utf-8', xml_declaration=True)
    print("Successfully configured AndroidManifest.xml with Mic, Storage Permissions & Cleartext Traffic!")

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
    package_name = "it.freeserv.virtukeys"
    
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
import android.webkit.WebView;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILE_CHOOSER_REQUEST_CODE = 1002;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableStickyImmersiveMode();
        requestAudioAndStoragePermissions();
        setupWebViewDownloadAndAudioHandler();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().post(() ->
                        bridge.getWebView().evaluateJavascript(
                            "if (window.__virtukeysHandleBack) { window.__virtukeysHandleBack(); } else { window.dispatchEvent(new CustomEvent('virtukeys:back')); }",
                            null
                        )
                    );
                }
            }
        });
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            }
            
            // Automatically grant microphone, media permissions, and handle file picker for MIDI / JSON imports
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        request.grant(request.getResources());
                    }
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams) {
                    if (MainActivity.this.filePathCallback != null) {
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                        MainActivity.this.filePathCallback = null;
                    }
                    MainActivity.this.filePathCallback = filePathCallback;
                    Intent intent = null;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        try {
                            intent = fileChooserParams.createIntent();
                        } catch (Exception e) {
                            intent = null;
                        }
                    }
                    if (intent == null) {
                        intent = new Intent(Intent.ACTION_GET_CONTENT);
                        intent.addCategory(Intent.CATEGORY_OPENABLE);
                        intent.setType("*/*");
                    }
                    try {
                        startActivityForResult(Intent.createChooser(intent, "Seleziona file MIDI o JSON"), FILE_CHOOSER_REQUEST_CODE);
                        return true;
                    } catch (Exception e) {
                        if (MainActivity.this.filePathCallback != null) {
                            MainActivity.this.filePathCallback.onReceiveValue(null);
                            MainActivity.this.filePathCallback = null;
                        }
                        return false;
                    }
                }
            });

            // Register JavascriptInterface for instant direct file saves
            webView.addJavascriptInterface(new AndroidFileSaver(), "AndroidFileSaver");

            // 1. Handle WebView file download triggers (JSON & MIDI data/blob URLs)
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        // Intercept WhatsApp links before download handler
                        if (url != null && (url.contains("whatsapp.com") || url.contains("wa.me") || url.startsWith("whatsapp:"))) {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return;
                        }

                        String fileName = "VirtuKeys_" + System.currentTimeMillis() + ".mp4";
                        if (contentDisposition != null && contentDisposition.contains("filename=")) {
                            fileName = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9)
                                .replace(String.valueOf((char)34), "").replace(";", "").trim();
                        } else if (url.contains(".mp4") || (mimetype != null && mimetype.contains("mp4"))) {
                            fileName = "VirtuKeys_Video_" + System.currentTimeMillis() + ".mp4";
                        } else if (url.contains(".webm") || (mimetype != null && mimetype.contains("webm"))) {
                            fileName = "VirtuKeys_Video_" + System.currentTimeMillis() + ".webm";
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

                        if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                            try {
                                android.app.DownloadManager.Request request = new android.app.DownloadManager.Request(Uri.parse(url));
                                if (mimetype != null && !mimetype.isEmpty()) {
                                    request.setMimeType(mimetype);
                                }
                                if (userAgent != null) {
                                    request.addRequestHeader("User-Agent", userAgent);
                                }
                                request.setDescription("Download VirtuKeys Studio");
                                request.setTitle(fileName);
                                request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                                request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fileName);
                                android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                                if (dm != null) {
                                    dm.enqueue(request);
                                    Toast.makeText(getApplicationContext(), "⬇️ Download in corso in Download: " + fileName, Toast.LENGTH_LONG).show();
                                    return;
                                }
                            } catch (Exception dmErr) {
                                dmErr.printStackTrace();
                            }
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
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null) {
                    if (data.getDataString() != null) {
                        results = new Uri[]{ Uri.parse(data.getDataString()) };
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        try {
                            results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                        } catch (Exception ignored) {}
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
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

def configure_gradle():
    kotlin_fix = """
allprojects {
    configurations.all {
        resolutionStrategy {
            eachDependency { DependencyResolveDetails details ->
                if (details.requested.group == 'org.jetbrains.kotlin') {
                    if (details.requested.name == 'kotlin-stdlib-jdk7' || details.requested.name == 'kotlin-stdlib-jdk8') {
                        details.useTarget 'org.jetbrains.kotlin:kotlin-stdlib:1.9.24'
                    }
                }
            }
        }
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
"""
    # 1. Root android/build.gradle
    root_gradle = 'android/build.gradle'
    if os.path.exists(root_gradle):
        try:
            with open(root_gradle, 'r', encoding='utf-8') as f:
                root_content = f.read()
            if 'kotlin-stdlib-jdk8' not in root_content:
                root_content += "\n" + kotlin_fix
                with open(root_gradle, 'w', encoding='utf-8') as f:
                    f.write(root_content)
                print("Successfully added Kotlin stdlib resolution to android/build.gradle")
        except Exception as e:
            print("Root Gradle config warning:", e)

    # 2. Module android/app/build.gradle
    gradle_path = 'android/app/build.gradle'
    if os.path.exists(gradle_path):
        try:
            with open(gradle_path, 'r', encoding='utf-8') as f:
                content = f.read()
            import re
            content = re.sub(r'sourceCompatibility\s+JavaVersion\.VERSION_\d+', 'sourceCompatibility JavaVersion.VERSION_21', content)
            content = re.sub(r'targetCompatibility\s+JavaVersion\.VERSION_\d+', 'targetCompatibility JavaVersion.VERSION_21', content)
            if 'signingConfigs {' not in content:
                signing_config_block = """
    signingConfigs {
        release {
            storeFile file('release.jks')
            storePassword 'virtukeys2026'
            keyAlias 'virtukeys-key'
            keyPassword 'virtukeys2026'
        }
    }
"""
                content = content.replace(' buildTypes {', signing_config_block + '\n    buildTypes {')

            if 'signingConfig signingConfigs.release' not in content:
                content = re.sub(
                    r'(buildTypes\s*\{\s*)(release\s*\{)',
                    r'\1\2\n            signingConfig signingConfigs.release',
                    content
                )

            if 'kotlin-stdlib-jdk8' not in content:
                content += "\n" + """
configurations.all {
    resolutionStrategy {
        eachDependency { DependencyResolveDetails details ->
            if (details.requested.group == 'org.jetbrains.kotlin') {
                if (details.requested.name == 'kotlin-stdlib-jdk7' || details.requested.name == 'kotlin-stdlib-jdk8') {
                    details.useTarget 'org.jetbrains.kotlin:kotlin-stdlib:1.9.24'
                }
            }
        }
    }
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
}
"""
            with open(gradle_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully aligned android/app/build.gradle to Java 21, signed release build, and resolved Kotlin stdlib conflicts")
        except Exception as e:
            print("Gradle config warning:", e)

    # 3. android/gradle.properties
    props_path = 'android/gradle.properties'
    if os.path.exists(props_path):
        try:
            with open(props_path, 'r', encoding='utf-8') as f:
                props = f.read()
            if 'android.useAndroidX=true' not in props:
                props += '\nandroid.useAndroidX=true\n'
            if 'android.enableJetifier=true' not in props:
                props += 'android.enableJetifier=true\n'
            with open(props_path, 'w', encoding='utf-8') as f:
                f.write(props)
            print("Successfully checked gradle.properties")
        except Exception as e:
            print("Properties config warning:", e)

def configure_min_sdk():
    variables_path = 'android/variables.gradle'
    if os.path.exists(variables_path):
        try:
            with open(variables_path, 'r', encoding='utf-8') as f:
                content = f.read()
            import re
            content = re.sub(r'minSdkVersion\s*=\s*\d+', 'minSdkVersion = 24', content)
            content = re.sub(r'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 36', content)
            content = re.sub(r'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 36', content)
            with open(variables_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully updated minSdkVersion to 24 and target/compileSdkVersion to 36 in android/variables.gradle")
        except Exception as e:
            print("variables.gradle config warning:", e)

    gradle_path = 'android/app/build.gradle'
    if os.path.exists(gradle_path):
        try:
            with open(gradle_path, 'r', encoding='utf-8') as f:
                content = f.read()
            import re
            content = re.sub(r'minSdk\s*=\s*\d+', 'minSdk = 24', content)
            content = re.sub(r'minSdkVersion\s+\d+', 'minSdkVersion 24', content)
            content = re.sub(r'targetSdk\s*=\s*\d+', 'targetSdk = 36', content)
            content = re.sub(r'targetSdkVersion\s+\d+', 'targetSdkVersion 36', content)
            content = re.sub(r'compileSdk\s*=\s*\d+', 'compileSdk = 36', content)
            content = re.sub(r'compileSdkVersion\s+\d+', 'compileSdkVersion 36', content)
            with open(gradle_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Successfully updated SDK levels (min=24, target=36, compile=36) in android/app/build.gradle")
        except Exception as e:
            print("app/build.gradle config warning:", e)

def configure_version():
    gradle_path = 'android/app/build.gradle'
    version_file = 'src/utils/versionInfo.ts'
    if os.path.exists(gradle_path) and os.path.exists(version_file):
        try:
            with open(version_file, 'r', encoding='utf-8') as f:
                ver_content = f.read()
            import re
            m = re.search(r"APP_VERSION\s*=\s*'([^']+)'", ver_content)
            if m:
                app_ver = m.group(1)
                # Build an integer code from major.minor.patch (e.g., 1.0.214 -> 10214)
                parts = app_ver.split('.')
                v_code = 1
                try:
                    if len(parts) >= 3:
                        v_code = int(parts[0]) * 10000 + int(parts[1]) * 1000 + int(parts[2])
                    else:
                        v_code = int(parts[-1])
                except:
                    v_code = 214

                with open(gradle_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                content = re.sub(r'versionCode\s+\d+', f'versionCode {v_code}', content)
                content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{app_ver}"', content)
                with open(gradle_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Successfully aligned Android build.gradle to versionCode {v_code} and versionName '{app_ver}'")
        except Exception as e:
            print("Version config warning:", e)

def update_icons():
    try:
        import subprocess
        subprocess.run(['node', 'scripts/update_android_icons.cjs'], check=False)
        print("Triggered update_android_icons.cjs")
    except Exception as e:
        print("Icon update error:", e)

if __name__ == '__main__':
    configure_manifest()
    configure_styles()
    configure_main_activity()
    configure_gradle()
    configure_min_sdk()
    configure_version()
    update_icons()
