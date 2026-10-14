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
    
    for activity in root.findall('.//activity'):
        activity.set(f'{android_ns}screenOrientation', 'sensorLandscape')
        activity.set(f'{android_ns}configChanges', 'orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode')
        activity.set(f'{android_ns}theme', '@style/AppTheme.NoActionBarFullscreen')
    
    tree.write(manifest_path, encoding='utf-8', xml_declaration=True)
    print("Successfully configured AndroidManifest.xml for sensorLandscape & NoActionBarFullscreen!")

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

    full_main_activity = f"""package {package_name};

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {{

    @Override
    protected void onCreate(Bundle savedInstanceState) {{
        super.onCreate(savedInstanceState);
        enableStickyImmersiveMode();
    }}

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {{
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {{
            enableStickyImmersiveMode();
        }}
    }}

    @Override
    public void onResume() {{
        super.onResume();
        enableStickyImmersiveMode();
    }}

    @Override
    public void onStart() {{
        super.onStart();
        enableStickyImmersiveMode();
    }}

    private void enableStickyImmersiveMode() {{
        Window window = getWindow();
        if (window == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {{
            window.getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }}

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
    }}
}}
"""
    with open(main_act_path, 'w', encoding='utf-8') as f:
        f.write(full_main_activity)
    print("Successfully configured MainActivity.java with Sticky Immersive Fullscreen!")

if __name__ == '__main__':
    configure_manifest()
    configure_styles()
    configure_main_activity()
