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
      web.navigationDelegate = context.coordinator

      // Give the coordinator a reference to the web view so it can inject
      // settings back into the page when requested.
      context.coordinator.webView = web

      // Load bundled Main.html from the app bundle resources
      if let url = Bundle.main.url(
        forResource: "Main", withExtension: "html", subdirectory: "Base.lproj")
      {
        web.loadFileURL(url, allowingReadAccessTo: Bundle.main.resourceURL!)
      }

      return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
      // Weak reference to avoid retain cycles
      weak var webView: WKWebView?

      override init() {
        super.init()
        NotificationCenter.default.addObserver(
          self, selector: #selector(settingsChanged(_:)),
          name: Notification.Name("FleanSettingsDidChange"), object: nil)
      }

      deinit {
        NotificationCenter.default.removeObserver(self)
      }

      // MARK: - Settings storage in app container
      private func settingsFileURL() -> URL? {
        let fm = FileManager.default
        do {
          let appSupport = try fm.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil,
            create: true)
          let dir = appSupport.appendingPathComponent("Flean", isDirectory: true)
          if !fm.fileExists(atPath: dir.path) {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true, attributes: nil)
          }
          return dir.appendingPathComponent("settings.json")
        } catch {
          NSLog("Flean: failed to get application support directory: %s", String(describing: error))
          return nil
        }
      }

      private func loadSettings() -> [String: Any] {
        guard let url = settingsFileURL(), FileManager.default.fileExists(atPath: url.path) else {
          return [:]
        }
        do {
          let data = try Data(contentsOf: url)
          if let obj = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
            return obj
          }
        } catch {
          NSLog("Flean: failed to load settings: %s", String(describing: error))
        }
        return [:]
      }

      private func saveSettings(_ dict: [String: Any]) -> Bool {
        guard let url = settingsFileURL() else { return false }
        do {
          let data = try JSONSerialization.data(withJSONObject: dict, options: [.prettyPrinted])
          try data.write(to: url, options: [.atomic])
          return true
        } catch {
          NSLog("Flean: failed to save settings: %s", String(describing: error))
          return false
        }
      }

      func userContentController(
        _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
      ) {
        // Expect either a string command or a dictionary with { action: "getSettings" | "setSettings", data: {...} }
        if let bodyStr = message.body as? String {
          if bodyStr == "open-preferences" {
            NSLog("Flean: open-preferences requested (iOS) — manual enable in Settings required")
            return
          }
          // legacy: handle simple 'get-settings' / 'set-settings' encoded strings
          if bodyStr == "get-settings" {
            sendSettingsToPage()
            return
          }
        }

        if let body = message.body as? [String: Any], let action = body["action"] as? String {
          switch action {
          case "getSettings":
            sendSettingsToPage()
          case "setSettings":
            if let data = body["data"] as? [String: Any] {
              let ok = saveSettings(data)
              // Acknowledge back to the page
              let ack = ["action": "setSettingsAck", "success": ok] as [String: Any]
              sendJSONToPage(ack)
            }
          default:
            break
          }
        }
      }

      private func sendJSONToPage(_ obj: Any) {
        guard let web = webView else { return }
        do {
          let data = try JSONSerialization.data(withJSONObject: obj, options: [])
          if let json = String(data: data, encoding: .utf8) {
            // We dispatch a CustomEvent 'flean:message' with the JSON as detail
            let safeJSON = json.replacingOccurrences(of: "\\\"", with: "\\\\\"")
            let js = "window.dispatchEvent(new CustomEvent('flean:message', { detail: \(json) }));"
            web.evaluateJavaScript(js, completionHandler: nil)
          }
        } catch {
          NSLog("Flean: failed to serialize message to page: %s", String(describing: error))
        }
      }

      private func sendSettingsToPage() {
        let settings = loadSettings()
        sendJSONToPage(["action": "settings", "data": settings])
      }

      @objc private func settingsChanged(_ note: Notification) {
        // Push updated settings into the web view when the SettingsStore saves.
        sendSettingsToPage()
      }

      // MARK: - WKNavigationDelegate
      func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Update the UI to use iOS-appropriate text. Extension state cannot be
        // queried programmatically on iOS (no SFSafariExtensionManager equivalent),
        // so we pass null for the enabled state (shows "unknown") and true for
        // useSettingsInsteadOfPreferences so the correct iOS wording is displayed.
        webView.evaluateJavaScript("show(null, true)", completionHandler: nil)
      }

    }
  }

  struct WebViewContainer_Previews: PreviewProvider {
    static var previews: some View {
      WebViewContainer()
    }
  }

#endif
