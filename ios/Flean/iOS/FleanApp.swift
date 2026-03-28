// iOS-only app entry. Guard so the file only compiles for the iOS platform,
// preventing build failures if the project is ever configured with non-iOS
// build settings (e.g. MACOSX_DEPLOYMENT_TARGET without SDKROOT = iphoneos).
#if os(iOS)
  import SwiftUI
  import WebKit

  @main
  struct FleanApp: App {
    var body: some Scene {
      WindowGroup {
        WebViewContainer()
      }
    }
  }

#endif
