#import "AppDelegate.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  // Llama al super, que ya inicializa Fabric, TurboModules, bridge, bundle URL, etc.
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

@end
