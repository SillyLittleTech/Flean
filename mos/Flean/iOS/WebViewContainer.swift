// iOS-only web view container. Guard compilation so macOS builds don't attempt to
// compile UIKit/SwiftUI iOS-only APIs.
#if os(iOS)
import SwiftUI
import WebKit
import UIKit

struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let webCfg = WKWebViewConfiguration()
        let web = WKWebView(frame: .zero, configuration: webCfg)

        // Add script message handler compatible with the macOS app's controller name
        web.configuration.userContentController.add(context.coordinator, name: "controller")

        // Load bundled Main.html from the app bundle resources
        if let url = Bundle.main.url(forResource: "Main", withExtension: "html", subdirectory: "Base.lproj") {
            web.loadFileURL(url, allowingReadAccessTo: Bundle.main.resourceURL!)
        }

        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, WKScriptMessageHandler {
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if let body = message.body as? String, body == "open-preferences" {
                // On iOS we can't open Safari extension preferences from the app like on macOS.
                // Consider directing users to Settings > Safari > Extensions.
                // For now, noop or show a log that this was requested.
                NSLog("Flean: open-preferences requested (iOS) — manual enable in Settings required")
            }
        }
    }
}

struct WebViewContainer_Previews: PreviewProvider {
    static var previews: some View {
        WebViewContainer()
    }
}

#endif
