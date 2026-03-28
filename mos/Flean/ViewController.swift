//
//  ViewController.swift
//  Flean
//
//  Created by Kiya Rose on 2025.10.30.
//

import Cocoa
import SafariServices
import WebKit

let extensionBundleIdentifier = "slf.Flean.Extension"

class ViewController: NSViewController, WKNavigationDelegate, WKScriptMessageHandler {

  @IBOutlet var webView: WKWebView!

  override func viewDidLoad() {
    super.viewDidLoad()

    self.webView.navigationDelegate = self

    self.webView.configuration.userContentController.add(self, name: "controller")

    guard
      let mainPageURL = Bundle.main.url(forResource: "Main", withExtension: "html"),
      let resourceURL = Bundle.main.resourceURL
    else {
      let message = "Failed to resolve bundled web resources."
      #if DEBUG
      assertionFailure(message)
      #endif
      NSLog("%@", message)
      let fallbackHTML = """
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Error</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; margin: 2rem; }
            h1 { font-size: 1.6rem; margin-bottom: 0.5rem; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <h1>Unable to load content</h1>
          <p>The app could not find its bundled web resources. Please reinstall the app or contact support.</p>
        </body>
      </html>
      """
      self.webView.loadHTMLString(fallbackHTML, baseURL: nil)
      return
    }

    self.webView.loadFileURL(mainPageURL, allowingReadAccessTo: resourceURL)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation?) {
    SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) {
      (state, error) in
      guard let state = state, error == nil else {
        // Insert code to inform the user that something went wrong.
        return
      }

      DispatchQueue.main.async {
        if #available(macOS 13, *) {
          webView.evaluateJavaScript("show(\(state.isEnabled), true)")
        } else {
          webView.evaluateJavaScript("show(\(state.isEnabled), false)")
        }
      }
    }
  }

  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard let action = message.body as? String, action == "open-preferences" else {
      return
    }

    SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) {
      _ in
      DispatchQueue.main.async {
        NSApplication.shared.terminate(nil)
      }
    }
  }

}
