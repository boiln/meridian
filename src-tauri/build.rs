fn main() {
    tauri_build::build();
    
    // Link against WinPcap libraries
    #[cfg(target_os = "windows")]
    {
        // Look for WinPcap in the lib directory relative to the project
        println!("cargo:rustc-link-search=native=lib");
        println!("cargo:rustc-link-lib=static=wpcap");
        println!("cargo:rustc-link-lib=static=packet");
        
        // Ensure Windows-specific dependencies are linked
        println!("cargo:rustc-link-lib=dylib=ws2_32");
        println!("cargo:rustc-link-lib=dylib=iphlpapi");
    }
}
