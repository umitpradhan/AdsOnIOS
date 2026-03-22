//
//  AdManager.h
//  AdsOnIOS
//
//  Google Mobile Ads manager — handles banner, interstitial, and rewarded ads.
//  Communicates results back to Cocos Creator TS via JsbBridge.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface AdManager : NSObject

+ (instancetype)sharedInstance;

/// Call once from AppDelegate to initialise Google Mobile Ads SDK.
- (void)initializeAds;

/// Banner ad controls
- (void)showBanner;
- (void)hideBanner;

/// Interstitial ad — loads then presents automatically.
- (void)showInterstitial;

/// Rewarded video — loads then presents automatically.
- (void)showRewarded;

@end

NS_ASSUME_NONNULL_END
