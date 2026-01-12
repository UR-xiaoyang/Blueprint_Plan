package com.yourcompany.blueprintplan;

import android.graphics.Color;
import android.view.View;
import android.view.Window;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NavigationBar")
public class NavigationBarPlugin extends Plugin {

    @PluginMethod
    public void setColor(PluginCall call) {
        String color = call.getString("color");
        Boolean darkButtons = call.getBoolean("darkButtons");

        if (color == null) {
            call.reject("Must provide a color");
            return;
        }

        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.setNavigationBarColor(Color.parseColor(color));

            if (darkButtons != null) {
                View decorView = window.getDecorView();
                int flags = decorView.getSystemUiVisibility();
                if (darkButtons) {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                decorView.setSystemUiVisibility(flags);
            }
            
            call.resolve();
        });
    }
}
