import UIKit
import React
import React_RCTAppDelegate        // ya lo tenías
import ReactAppDependencyProvider  // ya lo tenías
import ReactCommon                 // ↪️ añade esta línea

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // — 1️⃣ Prepara Fabric/TurboModules antes de crear el bridge —
    RCTAppSetupPrepareApp(application)    // marco de inicialización :contentReference[oaicite:1]{index=1}
    RCTAppSetupPrepareJS(launchOptions)

    // — 2️⃣ Crea tu delegate y habilita New Architecture —
    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()

    // ⚙️ Aquí activas Fabric y TurboModules
    delegate.fabricEnabled    = true
    delegate.newArchEnabled   = true

    reactNativeDelegate = delegate
    reactNativeFactory  = RCTReactNativeFactory(delegate: delegate)

    // — 3️⃣ Arranca React Native dentro de la ventana —
    window = UIWindow(frame: UIScreen.main.bounds)
    reactNativeFactory?.startReactNative(
      withModuleName: "MyNewApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

// Tu clase ReactNativeDelegate queda igual:
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}