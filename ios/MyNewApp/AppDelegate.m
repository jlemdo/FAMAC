#import "AppDelegate.h"
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

// Si seguiste con la new-arch y Fabric:
#import <ReactCommon/RCTTurboModuleManager.h>
#import <React/RCTFabricSurface.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Si usas Fabric / TurboModules:
  RCTAppSetupPrepareApp(application);
  RCTAppSetupPrepareJS(launchOptions);

  // Inicializa el bridge
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"MyNewApp"
                                            initialProperties:nil];

  rootView.backgroundColor = [UIColor whiteColor];
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *vc = [UIViewController new];
  vc.view = rootView;
  self.window.rootViewController = vc;
  [self.window makeKeyAndVisible];
  return YES;
}

// Delegate para localizar tu bundle JS
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
