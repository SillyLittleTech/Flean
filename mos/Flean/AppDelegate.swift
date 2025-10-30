//
//  AppDelegate.swift
//  Flean
//
//  Created by Kiya Rose on 2025.10.30.
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Override point for customization after application launch.
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    // Opt into secure state restoration. This tells the system that the app
    // supports secure coding for saved/restored state. Adds the explicit
    // delegate hook the system log warns about.
    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
        return true
    }

}
