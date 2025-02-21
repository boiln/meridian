# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

# Meridian Network Tool

## Prerequisites

Before running Meridian, ensure you have the following installed:

1. **WinPcap** - Required for network packet capture

    - Download and install from https://www.winpcap.org/
    - Make sure to install the developer tools if you plan to build from source

2. **Visual C++ Redistributable**
    - Download and install the latest version from Microsoft
    - Required for various Windows API features

## Installation

1. Install the prerequisites listed above
2. Download and run the Meridian installer
3. Follow the installation wizard instructions

## Troubleshooting

If you see "DLL not found" errors:

1. Verify WinPcap is installed correctly
    - Check that wpcap.dll exists in C:\Windows\System32 or C:\Windows\SysWOW64
    - Check that Packet.dll exists in C:\Windows\System32 or C:\Windows\SysWOW64
    - Try reinstalling WinPcap if files are missing
2. Try reinstalling the Visual C++ Redistributable
3. Restart your computer after installing dependencies
