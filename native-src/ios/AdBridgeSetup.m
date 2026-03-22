//
//  AdBridgeSetup.m
//  AdsOnIOS
//
//  Wires JsbBridge callbacks to route commands from Cocos Creator TS
//  to the native AdManager. Call [AdBridgeSetup setup] from AppDelegate.
//

#import <Foundation/Foundation.h>
#import "platform/apple/JsbBridge.h"
#import "AdManager.h"

@interface AdBridgeSetup : NSObject
+ (void)setup;
@end

@implementation AdBridgeSetup

+ (void)setup {
    // Initialise Google Mobile Ads SDK
    [[AdManager sharedInstance] initializeAds];

    // Register JsbBridge callback to handle commands from TypeScript
    JsbBridge *bridge = [JsbBridge sharedInstance];

    ICallback callback = ^void(NSString * _Nonnull arg0, NSString * _Nullable arg1) {
        NSLog(@"[AdBridgeSetup] Received command: %@ | arg1: %@", arg0, arg1 ?: @"(nil)");

        AdManager *manager = [AdManager sharedInstance];

        if ([arg0 isEqualToString:@"show_banner"]) {
            [manager showBanner];
        } else if ([arg0 isEqualToString:@"hide_banner"]) {
            [manager hideBanner];
        } else if ([arg0 isEqualToString:@"show_interstitial"]) {
            [manager showInterstitial];
        } else if ([arg0 isEqualToString:@"show_rewarded"]) {
            [manager showRewarded];
        } else {
            NSLog(@"[AdBridgeSetup] Unknown command: %@", arg0);
        }
    };

    [bridge setCallback:callback];
    NSLog(@"[AdBridgeSetup] JsbBridge callback registered");
}

@end
