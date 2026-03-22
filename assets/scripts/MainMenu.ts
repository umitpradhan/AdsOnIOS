import {
    _decorator,
    Component,
    Node,
    Label,
    Button,
    sys,
    Color,
    tween,
    UIOpacity,
} from 'cc';
import { AdBridge } from './AdBridge';

const { ccclass, property } = _decorator;

/** Coin storage key for sys.localStorage */
const COIN_KEY = 'ads_coin_balance';
/** Coins awarded per rewarded video completion */
const REWARD_AMOUNT = 50;
/** Duration in seconds for toast auto-fade */
const TOAST_DURATION = 2.5;

@ccclass('MainMenu')
export class MainMenu extends Component {

    // ── Editor-wired properties ──────────────────────────

    @property({ type: Label, tooltip: 'Title label at the top of the scene' })
    titleLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Coin balance display label' })
    coinLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Toast / status message label' })
    toastLabel: Label | null = null;

    @property({ type: Button, tooltip: 'Show / Hide Banner Ad button' })
    bannerButton: Button | null = null;

    @property({ type: Button, tooltip: 'Show Interstitial Ad button' })
    interstitialButton: Button | null = null;

    @property({ type: Button, tooltip: 'Show Rewarded Video Ad button' })
    rewardedButton: Button | null = null;

    // ── Internal state ───────────────────────────────────

    private _coins: number = 0;
    private _bannerVisible: boolean = false;
    private _inputLocked: boolean = false;
    private _toastTimer: number = 0;
    private _bridge!: AdBridge;

    // ── Lifecycle ────────────────────────────────────────

    onLoad(): void {
        this._bridge = AdBridge.getInstance();

        // Load persisted coin balance
        const saved = sys.localStorage.getItem(COIN_KEY);
        this._coins = saved ? parseInt(saved, 10) || 0 : 0;

        this._registerAdEvents();
    }

    start(): void {
        // Update UI with loaded state
        this._updateCoinLabel();
        this._hideToast();

        if (this.titleLabel) {
            this.titleLabel.string = 'Ads Demo';
        }

        // Wire button click handlers
        this.bannerButton?.node.on(Button.EventType.CLICK, this._onBannerClick, this);
        this.interstitialButton?.node.on(Button.EventType.CLICK, this._onInterstitialClick, this);
        this.rewardedButton?.node.on(Button.EventType.CLICK, this._onRewardedClick, this);

        this._updateBannerButtonLabel();
    }

    onDestroy(): void {
        this._unregisterAdEvents();
    }

    // ── Button handlers ──────────────────────────────────

    private _onBannerClick(): void {
        if (this._inputLocked) return;

        if (this._bannerVisible) {
            this._bridge.hideBanner();
            this._showToast('Hiding banner…');
        } else {
            this._bridge.showBanner();
            this._showToast('Loading banner…');
        }
    }

    private _onInterstitialClick(): void {
        if (this._inputLocked) return;
        this._lockInput();
        this._showToast('Loading interstitial…');
        this._bridge.showInterstitial();
    }

    private _onRewardedClick(): void {
        if (this._inputLocked) return;
        this._lockInput();
        this._showToast('Loading rewarded video…');
        this._bridge.showRewarded();
    }

    // ── Ad event listeners ───────────────────────────────

    private _registerAdEvents(): void {
        const e = this._bridge.events;

        // Banner
        e.on('banner_loaded', this._onBannerLoaded, this);
        e.on('banner_failed', this._onBannerFailed, this);
        e.on('banner_shown', this._onBannerShown, this);
        e.on('banner_hidden', this._onBannerHidden, this);

        // Interstitial
        e.on('interstitial_loaded', this._onInterstitialLoaded, this);
        e.on('interstitial_failed', this._onInterstitialFailed, this);
        e.on('interstitial_shown', this._onInterstitialShown, this);
        e.on('interstitial_dismissed', this._onInterstitialDismissed, this);

        // Rewarded
        e.on('rewarded_loaded', this._onRewardedLoaded, this);
        e.on('rewarded_failed', this._onRewardedFailed, this);
        e.on('rewarded_shown', this._onRewardedShown, this);
        e.on('rewarded_earned', this._onRewardedEarned, this);
        e.on('rewarded_dismissed', this._onRewardedDismissed, this);
    }

    private _unregisterAdEvents(): void {
        const e = this._bridge.events;
        e.off('banner_loaded', this._onBannerLoaded, this);
        e.off('banner_failed', this._onBannerFailed, this);
        e.off('banner_shown', this._onBannerShown, this);
        e.off('banner_hidden', this._onBannerHidden, this);
        e.off('interstitial_loaded', this._onInterstitialLoaded, this);
        e.off('interstitial_failed', this._onInterstitialFailed, this);
        e.off('interstitial_shown', this._onInterstitialShown, this);
        e.off('interstitial_dismissed', this._onInterstitialDismissed, this);
        e.off('rewarded_loaded', this._onRewardedLoaded, this);
        e.off('rewarded_failed', this._onRewardedFailed, this);
        e.off('rewarded_shown', this._onRewardedShown, this);
        e.off('rewarded_earned', this._onRewardedEarned, this);
        e.off('rewarded_dismissed', this._onRewardedDismissed, this);
    }

    // ── Banner callbacks ─────────────────────────────────

    private _onBannerLoaded(): void {
        this._showToast('Banner loaded');
    }

    private _onBannerFailed(payload: any): void {
        const msg = payload?.error ?? 'Unknown error';
        this._showToast(`Banner failed: ${msg}`);
    }

    private _onBannerShown(): void {
        this._bannerVisible = true;
        this._updateBannerButtonLabel();
        this._showToast('Banner shown');
    }

    private _onBannerHidden(): void {
        this._bannerVisible = false;
        this._updateBannerButtonLabel();
        this._showToast('Banner hidden');
    }

    // ── Interstitial callbacks ───────────────────────────

    private _onInterstitialLoaded(): void {
        this._showToast('Interstitial loaded');
    }

    private _onInterstitialFailed(payload: any): void {
        const msg = payload?.error ?? 'Unknown error';
        this._showToast(`Interstitial failed: ${msg}`);
        this._unlockInput();
    }

    private _onInterstitialShown(): void {
        this._showToast('Interstitial showing');
    }

    private _onInterstitialDismissed(): void {
        this._showToast('Interstitial dismissed');
        this._unlockInput();
    }

    // ── Rewarded callbacks ───────────────────────────────

    private _onRewardedLoaded(): void {
        this._showToast('Rewarded video loaded');
    }

    private _onRewardedFailed(payload: any): void {
        const msg = payload?.error ?? 'Unknown error';
        this._showToast(`Rewarded failed: ${msg}`);
        this._unlockInput();
    }

    private _onRewardedShown(): void {
        this._showToast('Rewarded video showing');
    }

    private _onRewardedEarned(payload: any): void {
        this._coins += REWARD_AMOUNT;
        this._persistCoins();
        this._updateCoinLabel();
        this._showToast(`Rewarded completed! +${REWARD_AMOUNT} coins 🎉`);
    }

    private _onRewardedDismissed(): void {
        this._showToast('Rewarded video dismissed');
        this._unlockInput();
    }

    // ── UI helpers ───────────────────────────────────────

    private _updateCoinLabel(): void {
        if (this.coinLabel) {
            this.coinLabel.string = `Coins: ${this._coins}`;
        }
    }

    private _updateBannerButtonLabel(): void {
        if (this.bannerButton) {
            const label = this.bannerButton.node.getChildByName('Label');
            if (label) {
                const lc = label.getComponent(Label);
                if (lc) {
                    lc.string = this._bannerVisible ? 'Hide Banner Ad' : 'Show Banner Ad';
                }
            }
        }
    }

    private _persistCoins(): void {
        sys.localStorage.setItem(COIN_KEY, this._coins.toString());
    }

    // ── Toast system ─────────────────────────────────────

    private _showToast(message: string): void {
        if (!this.toastLabel) return;

        this.toastLabel.string = message;
        this.toastLabel.node.active = true;

        // Reset opacity
        let opacity = this.toastLabel.node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = this.toastLabel.node.addComponent(UIOpacity);
        }
        opacity.opacity = 255;

        // Cancel any running tween on this node and schedule fade-out
        tween(opacity)
            .delay(TOAST_DURATION)
            .to(0.5, { opacity: 0 })
            .call(() => {
                this.toastLabel!.node.active = false;
            })
            .start();
    }

    private _hideToast(): void {
        if (this.toastLabel) {
            this.toastLabel.node.active = false;
        }
    }

    // ── Input lock (disable buttons while fullscreen ad is active) ───

    private _lockInput(): void {
        this._inputLocked = true;
        this._setButtonsInteractable(false);
    }

    private _unlockInput(): void {
        this._inputLocked = false;
        this._setButtonsInteractable(true);
    }

    private _setButtonsInteractable(interactable: boolean): void {
        if (this.bannerButton) this.bannerButton.interactable = interactable;
        if (this.interstitialButton) this.interstitialButton.interactable = interactable;
        if (this.rewardedButton) this.rewardedButton.interactable = interactable;
    }
}
