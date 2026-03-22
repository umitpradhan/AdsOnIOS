import { _decorator, Component, EventTarget, sys } from 'cc';

/**
 * AdBridge — Singleton abstraction over Cocos Creator's native.bridge (JsbBridge).
 *
 * TS → Native commands:
 *   show_banner, hide_banner, show_interstitial, show_rewarded
 *
 * Native → TS events (via EventTarget):
 *   banner_loaded, banner_failed, banner_shown, banner_hidden
 *   interstitial_loaded, interstitial_failed, interstitial_shown, interstitial_dismissed
 *   rewarded_loaded, rewarded_failed, rewarded_shown, rewarded_earned, rewarded_dismissed
 */
export class AdBridge {

    private static _instance: AdBridge | null = null;
    private _events: EventTarget = new EventTarget();
    private _initialized: boolean = false;

    /** Get the singleton instance. */
    static getInstance(): AdBridge {
        if (!AdBridge._instance) {
            AdBridge._instance = new AdBridge();
        }
        return AdBridge._instance;
    }

    /** EventTarget for ad lifecycle events. */
    get events(): EventTarget {
        return this._events;
    }

    /**
     * Initialise the bridge listener.
     * Call once on app start (e.g. from Approot.onLoad).
     */
    init(): void {
        if (this._initialized) return;
        this._initialized = true;

        if (sys.isNative && sys.os === sys.OS.IOS) {
            this._registerNativeListener();
            console.log('[AdBridge] Native listener registered (iOS)');
        } else {
            console.warn('[AdBridge] Not running on native iOS — ad calls will be no-ops');
        }
    }

    // ────────────────────────────────────────────
    // Public API — TS → Native
    // ────────────────────────────────────────────

    showBanner(): void {
        this._sendToNative('show_banner');
    }

    hideBanner(): void {
        this._sendToNative('hide_banner');
    }

    showInterstitial(): void {
        this._sendToNative('show_interstitial');
    }

    showRewarded(): void {
        this._sendToNative('show_rewarded');
    }

    // ────────────────────────────────────────────
    // Internals
    // ────────────────────────────────────────────

    /**
     * Send a command string to the native layer.
     * On non‐native builds this is a no‐op.
     */
    private _sendToNative(command: string, arg?: string): void {
        if (!sys.isNative || sys.os !== sys.OS.IOS) {
            console.log(`[AdBridge] (stub) sendToNative: ${command} ${arg ?? ''}`);
            return;
        }

        try {
            // Cocos Creator 3.x native bridge API
            // @ts-ignore — native.bridge exists at runtime on native builds
            native.bridge.sendToNative(command, arg ?? '');
            console.log(`[AdBridge] sendToNative: ${command}`);
        } catch (e) {
            console.error(`[AdBridge] sendToNative failed: ${e}`);
        }
    }

    /**
     * Register the onNative callback to route events from the native layer.
     * arg0 = event type string (e.g. "rewarded_earned")
     * arg1 = optional JSON payload
     */
    private _registerNativeListener(): void {
        try {
            // @ts-ignore — native.bridge exists at runtime on native builds
            native.bridge.onNative = (arg0: string, arg1?: string | null) => {
                console.log(`[AdBridge] onNative: ${arg0} | ${arg1 ?? ''}`);

                let payload: any = null;
                if (arg1) {
                    try {
                        payload = JSON.parse(arg1);
                    } catch (_) {
                        payload = arg1; // plain string
                    }
                }

                // Emit typed event so MainMenu (or any listener) can react
                this._events.emit(arg0, payload);
            };
        } catch (e) {
            console.error(`[AdBridge] Failed to register native listener: ${e}`);
        }
    }
}
