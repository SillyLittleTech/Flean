// Shared settings storage for the iOS host. Used by SettingsView and the WebViewCoordinator.
#if os(iOS)
import Foundation

@objcMembers
public class SettingsStore: NSObject {
    public static let shared = SettingsStore()

    public struct Keys {
        public static let selectedMirror = "selectedMirror"
        public static let mirrors = "mirrors"
        public static let allowedSites = "allowedSites"
        public static let askOnVisit = "askOnVisit"
    }

    public let defaultMirrors: [String] = [
        "breezewiki.com",
        "antifandom.com",
        "breezewiki.pussthecat.org",
        "bw.hamstro.dev",
        "bw.projectsegfau.lt",
        "breeze.hostux.net",
        "bw.artemislena.eu",
        "nerd.whatever.social",
        "breezewiki.frontendfriendly.xyz",
        "breeze.nohost.network",
        "breeze.whateveritworks.org",
        "z.opnxng.com",
        "breezewiki.hyperreal.coffee",
        "breezewiki.catsarch.com",
        "breeze.mint.lgbt",
        "breezewiki.woodland.cafe",
        "breezewiki.nadeko.net",
        "fandom.reallyaweso.me",
        "breezewiki.4o1x5.dev",
        "breezewiki.r4fo.com",
        "breezewiki.private.coffee",
        "fan.blitzw.in"
    ]

    private override init() { super.init() }

    private func settingsFileURL() -> URL? {
        let fm = FileManager.default
        do {
            let appSupport = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            let dir = appSupport.appendingPathComponent("Flean", isDirectory: true)
            if !fm.fileExists(atPath: dir.path) {
                try fm.createDirectory(at: dir, withIntermediateDirectories: true, attributes: nil)
            }
            return dir.appendingPathComponent("settings.json")
        } catch {
            NSLog("Flean: settingsFileURL error: %s", String(describing: error))
            return nil
        }
    }

    public func load() -> [String: Any] {
        guard let url = settingsFileURL(), FileManager.default.fileExists(atPath: url.path) else {
            return [
                Keys.selectedMirror: defaultMirrors.first ?? "breezewiki.com",
                Keys.mirrors: defaultMirrors,
                Keys.allowedSites: [String](),
                Keys.askOnVisit: false
            ]
        }
        do {
            let data = try Data(contentsOf: url)
            if let obj = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
                return obj
            }
        } catch {
            NSLog("Flean: load settings error: %s", String(describing: error))
        }
        return [
            Keys.selectedMirror: defaultMirrors.first ?? "breezewiki.com",
            Keys.mirrors: defaultMirrors,
            Keys.allowedSites: [String](),
            Keys.askOnVisit: false
        ]
    }

    @discardableResult
    public func save(_ dict: [String: Any]) -> Bool {
        guard let url = settingsFileURL() else { return false }
        do {
            let data = try JSONSerialization.data(withJSONObject: dict, options: [.prettyPrinted])
            try data.write(to: url, options: [.atomic])
            NotificationCenter.default.post(name: Notification.Name("FleanSettingsDidChange"), object: nil)
            return true
        } catch {
            NSLog("Flean: save settings error: %s", String(describing: error))
            return false
        }
    }

}

#endif
