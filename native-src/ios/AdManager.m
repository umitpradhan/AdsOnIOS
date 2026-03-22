//
//  AdManager.m
//  AdsOnIOS
//
//  Google Mobile Ads manager implementation.
//  Uses official test ad unit IDs for development.
//

#import "AdManager.h"
#import <GoogleMobileAds/GoogleMobileAds.h>
#import "platform/apple/JsbBridge.h"

// ─── Test Ad Unit IDs (replace with production IDs before release) ───
static NSString * const kBannerAdUnitID       = @"ca-app-pub-3940256099942544/2934735716";
static NSString * const kInterstitialAdUnitID = @"ca-app-pub-3940256099942544/4411468910";
static NSString * const kRewardedAdUnitID     = @"ca-app-pub-3940256099942544/1712485313";

@interface AdManager () <GADBannerViewDelegate, GADFullScreenContentDelegate>

@property (nonatomic, strong, nullable) GADBannerView      *bannerView;
@property (nonatomic, strong, nullable) GADInterstitialAd  *interstitialAd;
@property (nonatomic, strong, nullable) GADRewardedAd      *rewardedAd;
@property (nonatomic, assign)          BOOL                 bannerVisible;

@end

@implementation AdManager

#pragma mark - Singleton

+ (instancetype)sharedInstance {
    static AdManager *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[AdManager alloc] init];
    });
    return instance;
}

#pragma mark - Initialisation

- (void)initializeAds {
    [[GADMobileAds sharedInstance] startWithCompletionHandler:^(GADInitializationStatus * _Nonnull status) {
        NSLog(@"[AdManager] Google Mobile Ads SDK initialised. Status: %@", status.adapterStatusesByClassName);
        [self sendToScript:@"ads_sdk_ready" arg1:nil];
    }];
}

#pragma mark - Banner

- (void)showBanner {
    dispatch_async(dispatch_get_main_queue(), ^{
        UIViewController *rootVC = [self rootViewController];
        if (!rootVC) {
            [self sendToScript:@"banner_failed" arg1:@"{\"error\":\"No root view controller\"}"];
            return;
        }

        if (self.bannerView) {
            // Already created — just show it
            self.bannerView.hidden = NO;
            self.bannerVisible = YES;
            [self sendToScript:@"banner_shown" arg1:nil];
            return;
        }

        // Create adaptive banner
        GADAdSize adSize = GADCurrentOrientationAnchoredAdaptiveBannerAdSizeWithWidth(
            rootVC.view.frame.size.width
        );
        self.bannerView = [[GADBannerView alloc] initWithAdSize:adSize];
        self.bannerView.adUnitID = kBannerAdUnitID;
        self.bannerView.rootViewController = rootVC;
        self.bannerView.delegate = self;

        // Position at bottom, respecting safe area
        self.bannerView.translatesAutoresizingMaskIntoConstraints = NO;
        [rootVC.view addSubview:self.bannerView];

        UILayoutGuide *guide = rootVC.view.safeAreaLayoutGuide;
        [NSLayoutConstraint activateConstraints:@[
            [self.bannerView.bottomAnchor constraintEqualToAnchor:guide.bottomAnchor],
            [self.bannerView.centerXAnchor constraintEqualToAnchor:rootVC.view.centerXAnchor]
        ]];

        GADRequest *request = [GADRequest request];
        [self.bannerView loadRequest:request];

        self.bannerVisible = YES;
    });
}

- (void)hideBanner {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.bannerView) {
            self.bannerView.hidden = YES;
            self.bannerVisible = NO;
            [self sendToScript:@"banner_hidden" arg1:nil];
        }
    });
}

#pragma mark - GADBannerViewDelegate

- (void)bannerViewDidReceiveAd:(GADBannerView *)bannerView {
    NSLog(@"[AdManager] Banner loaded");
    [self sendToScript:@"banner_loaded" arg1:nil];
    [self sendToScript:@"banner_shown" arg1:nil];
}

- (void)bannerView:(GADBannerView *)bannerView didFailToReceiveAdWithError:(NSError *)error {
    NSLog(@"[AdManager] Banner failed: %@", error.localizedDescription);
    NSString *payload = [NSString stringWithFormat:@"{\"error\":\"%@\"}", error.localizedDescription];
    [self sendToScript:@"banner_failed" arg1:payload];
}

#pragma mark - Interstitial

- (void)showInterstitial {
    [self sendToScript:@"interstitial_loading" arg1:nil];

    GADRequest *request = [GADRequest request];
    [GADInterstitialAd loadWithAdUnitID:kInterstitialAdUnitID
                                request:request
                      completionHandler:^(GADInterstitialAd * _Nullable ad, NSError * _Nullable error) {
        if (error) {
            NSLog(@"[AdManager] Interstitial load failed: %@", error.localizedDescription);
            NSString *payload = [NSString stringWithFormat:@"{\"error\":\"%@\"}", error.localizedDescription];
            [self sendToScript:@"interstitial_failed" arg1:payload];
            return;
        }

        self.interstitialAd = ad;
        self.interstitialAd.fullScreenContentDelegate = self;
        [self sendToScript:@"interstitial_loaded" arg1:nil];

        dispatch_async(dispatch_get_main_queue(), ^{
            UIViewController *rootVC = [self rootViewController];
            if (rootVC) {
                [self.interstitialAd presentFromRootViewController:rootVC];
            } else {
                [self sendToScript:@"interstitial_failed" arg1:@"{\"error\":\"No root view controller\"}"];
            }
        });
    }];
}

#pragma mark - Rewarded

- (void)showRewarded {
    [self sendToScript:@"rewarded_loading" arg1:nil];

    GADRequest *request = [GADRequest request];
    [GADRewardedAd loadWithAdUnitID:kRewardedAdUnitID
                            request:request
                  completionHandler:^(GADRewardedAd * _Nullable ad, NSError * _Nullable error) {
        if (error) {
            NSLog(@"[AdManager] Rewarded load failed: %@", error.localizedDescription);
            NSString *payload = [NSString stringWithFormat:@"{\"error\":\"%@\"}", error.localizedDescription];
            [self sendToScript:@"rewarded_failed" arg1:payload];
            return;
        }

        self.rewardedAd = ad;
        self.rewardedAd.fullScreenContentDelegate = self;
        [self sendToScript:@"rewarded_loaded" arg1:nil];

        dispatch_async(dispatch_get_main_queue(), ^{
            UIViewController *rootVC = [self rootViewController];
            if (rootVC) {
                [self.rewardedAd presentFromRootViewController:rootVC
                                      userDidEarnRewardHandler:^{
                    GADAdReward *reward = self.rewardedAd.adReward;
                    NSLog(@"[AdManager] User earned reward: %.0f %@", reward.amount.doubleValue, reward.type);
                    NSString *payload = [NSString stringWithFormat:@"{\"amount\":%.0f,\"type\":\"%@\"}",
                                         reward.amount.doubleValue, reward.type];
                    [self sendToScript:@"rewarded_earned" arg1:payload];
                }];
            } else {
                [self sendToScript:@"rewarded_failed" arg1:@"{\"error\":\"No root view controller\"}"];
            }
        });
    }];
}

#pragma mark - GADFullScreenContentDelegate

- (void)adDidPresentFullScreenContent:(id<GADFullScreenPresentingAd>)ad {
    if ([ad isKindOfClass:[GADInterstitialAd class]]) {
        NSLog(@"[AdManager] Interstitial shown");
        [self sendToScript:@"interstitial_shown" arg1:nil];
    } else if ([ad isKindOfClass:[GADRewardedAd class]]) {
        NSLog(@"[AdManager] Rewarded shown");
        [self sendToScript:@"rewarded_shown" arg1:nil];
    }
}

- (void)ad:(id<GADFullScreenPresentingAd>)ad didFailToPresentFullScreenContentWithError:(NSError *)error {
    NSLog(@"[AdManager] Fullscreen ad failed to present: %@", error.localizedDescription);
    NSString *payload = [NSString stringWithFormat:@"{\"error\":\"%@\"}", error.localizedDescription];

    if ([ad isKindOfClass:[GADInterstitialAd class]]) {
        [self sendToScript:@"interstitial_failed" arg1:payload];
    } else if ([ad isKindOfClass:[GADRewardedAd class]]) {
        [self sendToScript:@"rewarded_failed" arg1:payload];
    }
}

- (void)adDidDismissFullScreenContent:(id<GADFullScreenPresentingAd>)ad {
    if ([ad isKindOfClass:[GADInterstitialAd class]]) {
        NSLog(@"[AdManager] Interstitial dismissed");
        self.interstitialAd = nil;
        [self sendToScript:@"interstitial_dismissed" arg1:nil];
    } else if ([ad isKindOfClass:[GADRewardedAd class]]) {
        NSLog(@"[AdManager] Rewarded dismissed");
        self.rewardedAd = nil;
        [self sendToScript:@"rewarded_dismissed" arg1:nil];
    }
}

#pragma mark - JsbBridge Helper

- (void)sendToScript:(NSString *)event arg1:(nullable NSString *)arg1 {
    dispatch_async(dispatch_get_main_queue(), ^{
        JsbBridge *bridge = [JsbBridge sharedInstance];
        if (arg1) {
            [bridge sendToScript:event arg1:arg1];
        } else {
            [bridge sendToScript:event];
        }
    });
}

#pragma mark - Utility

- (UIViewController *)rootViewController {
    UIWindowScene *scene = (UIWindowScene *)[[[UIApplication sharedApplication] connectedScenes] anyObject];
    return scene.windows.firstObject.rootViewController;
}

@end
