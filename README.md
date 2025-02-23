# Meridian

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.3-blue.svg)](https://github.com/yourusername/meridian/releases)
[![Tauri 2.0](https://img.shields.io/badge/Tauri-2.0-blue)](https://tauri.app/)
[![Windows Support](https://img.shields.io/badge/Windows-10%2F11-brightgreen)](https://www.microsoft.com/windows)

![meridian_0.1.3](https://github.com/user-attachments/assets/ce9333a3-3437-429e-aa6c-329c7941a01a)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

> ⚠️ **Disclaimer**: This tool is for educational purposes only. Users are responsible for complying with all applicable laws and terms of service.

## Overview

Meridian is an open-source network manipulation tool built with Tauri 2.0, React, and TypeScript. It provides capabilities for analyzing and manipulating network traffic, primarily focused on studying network behavior in PC games.

### Current Features (v0.1.3)

- Real-time network traffic monitoring
    - Download speed tracking
    - Upload speed tracking
- Modern, responsive UI built with React and TailwindCSS
- Native performance with Rust backend

### Planned Features

- Network traffic limiting
- Advanced packet manipulation
- Custom rules and filters

## Prerequisites

Before running Meridian, ensure you have the following installed:

1. **WinPcap** - Required for network packet capture

    - Download and install from [WinPcap's official website](https://www.winpcap.org/)
    - Make sure to install the developer tools if you plan to build from source

2. **Visual C++ Redistributable**
    - Download and install the latest version from Microsoft
    - Required for various Windows API features

## Installation

### From Release

1. Download the latest release from the [releases page](https://github.com/yourusername/meridian/releases)
2. Run the installer and follow the wizard instructions
3. Launch Meridian from the Start Menu or desktop shortcut

### Building from Source

1. Install prerequisites:

    - [Node.js](https://nodejs.org/) (v18 or later)
    - [Rust](https://rustup.rs/) (latest stable)
    - [pnpm](https://pnpm.io/) (latest version)

2. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/meridian.git
    cd meridian
    ```

3. Install dependencies:

    ```bash
    pnpm install
    ```

4. Build the application:
    ```bash
    pnpm tauri build
    ```

## Platform Support

- ✅ Windows 10 (Tested)
- ✅ Windows 11 (Tested)
- ❓ macOS (Untested - may require additional dependencies)
- ❓ Linux (Untested - may require additional dependencies)

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) with extensions:
    - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
    - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
    - [TypeScript and JavaScript](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-javascript)

### Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build
```

## Troubleshooting

### Common Issues

1. "DLL not found" errors:

    - Verify WinPcap is installed correctly
    - Check that wpcap.dll exists in C:\Windows\System32 or C:\Windows\SysWOW64
    - Check that Packet.dll exists in C:\Windows\System32 or C:\Windows\SysWOW64
    - Try reinstalling WinPcap if files are missing

2. Performance Issues:
    - Ensure your system meets the minimum requirements
    - Check for conflicting network monitoring software
    - Update your network drivers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) for the amazing framework
- [WinPcap](https://www.winpcap.org/) for network capture capabilities
- All contributors and users of this project
