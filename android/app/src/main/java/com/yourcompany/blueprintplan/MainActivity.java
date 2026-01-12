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
        
        // Set status bar to black and navigation bar to transparent/black as needed
        Window window = getWindow();
        window.setStatusBarColor(0xFF000000); // Black
        window.setNavigationBarColor(0xFF000000); // Black for consistency or keep transparent if needed

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }
}
