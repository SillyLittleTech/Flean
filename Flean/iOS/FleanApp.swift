// iOS-only app entry. Guard so the file can live in the repo without
// conflicting with the macOS `@main` app in `Flean/AppDelegate.swift`.
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
