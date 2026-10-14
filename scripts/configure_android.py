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
        # Keep existing standard theme or ensure AppTheme.NoActionBar
        if activity.get(f'{android_ns}theme') == '@style/AppTheme.NoActionBarFullscreen':
            activity.set(f'{android_ns}theme', '@style/AppTheme.NoActionBar')
    
    tree.write(manifest_path, encoding='utf-8', xml_declaration=True)
    print("Successfully configured AndroidManifest.xml for sensorLandscape!")

def configure_styles():
    for root_dir, dirs, files in os.walk('android/app/src/main/res'):
        for file in files:
            if file == 'styles.xml':
                styles_path = os.path.join(root_dir, file)
                try:
                    with open(styles_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if 'android:windowFullscreen' not in content:
                        content = content.replace(
                            '</style>',
                            '    <item name="android:windowFullscreen">true</item>\n        <item name="android:windowContentOverlay">@null</item>\n    </style>'
                        )
                        with open(styles_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Added windowFullscreen to {styles_path}")
                except Exception as e:
                    print("Styles config error:", e)

def configure_main_activity():
    main_act_path = None
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

    with open(main_act_path, 'r', encoding='utf-8') as f:
        code = f.read()

    if 'SYSTEM_UI_FLAG_IMMERSIVE_STICKY' in code:
        print("MainActivity.java already configured for Immersive Sticky fullscreen!")
        return

    imports = (
        "import android.os.Bundle;\n"
        "import android.view.View;\n"
        "import android.view.WindowManager;\n"
        "import androidx.core.view.WindowCompat;\n"
        "import androidx.core.view.WindowInsetsCompat;\n"
        "import androidx.core.view.WindowInsetsControllerCompat;\n"
    )
    
    code = code.replace("import com.getcapacitor.BridgeActivity;", "import com.getcapacitor.BridgeActivity;\n" + imports)
    
    sticky_code = """
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
        
        try {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        } catch (Exception e) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().setSystemUiVisibility(
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
    code = code.replace("public class MainActivity extends BridgeActivity {", "public class MainActivity extends BridgeActivity {" + sticky_code)
    
    with open(main_act_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully configured MainActivity.java with Dual-Mode Sticky Immersive Fullscreen!")

if __name__ == '__main__':
    configure_manifest()
    configure_styles()
    configure_main_activity()
