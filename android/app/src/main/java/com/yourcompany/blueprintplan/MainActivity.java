package com.yourcompany.blueprintplan;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavigationBarPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge to edge
        // WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Set status bar to transparent to let webview content show through
        Window window = getWindow();
        window.setStatusBarColor(0x00000000); // Transparent
        window.setNavigationBarColor(0xFF000000); // Black for navigation bar

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }
}
