package com.naveenneog.chakravarti;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

import java.io.File;

/**
 * Drops the WebView's service-worker storage whenever the installed version
 * changes.
 *
 * The web bundle used to register a service worker. Its precache lives in the
 * app's data directory, not in the APK, so it survived an upgrade -- and a
 * worker registered by an older build kept serving that build's bundle
 * forever. Installing a new APK visibly ran the previous version of the game,
 * and relaunching never fixed it: the stale worker answered the navigation
 * before any new JavaScript could run and unregister itself.
 *
 * The bundle no longer ships a worker at all (see vite.config.ts), but that
 * only helps devices that never registered one. This clears out the ones that
 * already did.
 *
 * Deliberately narrow: only the Service Worker directories are removed. Local
 * Storage is left alone so campaign progress survives the upgrade.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "Chakravarti";
    private static final String PREFS = "chakravarti.shell";
    private static final String LAST_VERSION = "lastVersionCode";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must run before super.onCreate(), which is what spins up the WebView
        // and opens these files.
        clearServiceWorkerOnUpgrade();
        super.onCreate(savedInstanceState);
    }

    private void clearServiceWorkerOnUpgrade() {
        try {
            long current = getPackageManager()
                    .getPackageInfo(getPackageName(), 0)
                    .getLongVersionCode();
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            long previous = prefs.getLong(LAST_VERSION, -1L);
            if (previous == current) {
                return;
            }

            File webview = new File(getApplicationInfo().dataDir, "app_webview");
            deleteRecursively(new File(webview, "Default/Service Worker"));
            deleteRecursively(new File(webview, "Service Worker"));
            prefs.edit().putLong(LAST_VERSION, current).apply();
            Log.i(TAG, "Cleared WebView service worker storage for version " + current);
        } catch (Exception error) {
            // Never block startup over a cache cleanup.
            Log.w(TAG, "Service worker cleanup skipped: " + error.getMessage());
        }
    }

    private void deleteRecursively(File target) {
        if (target == null || !target.exists()) {
            return;
        }
        File[] children = target.listFiles();
        if (children != null) {
            for (File child : children) {
                deleteRecursively(child);
            }
        }
        // Result ignored on purpose: a file we cannot remove must not abort the
        // rest of the sweep, and the app still starts either way.
        target.delete();
    }
}
