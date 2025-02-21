mod cache;
mod commands;
mod models;
mod modules {
    pub mod system_monitor;
    pub mod network_monitor;
    pub mod process_metadata;
}
mod utils;
pub use utils::logger::init as init_logger;

use std::sync::Arc;
use tokio::runtime::Runtime;
use once_cell::sync::Lazy;

pub use models::{ProcessStatus, NetworkUsage, ProcessNetworkUsage, ApplicationProcess};
pub use commands::{
    get_processes,
    throttle_process,
    unthrottle_process,
    get_network_usage,
    clear_all_cache,
    clear_process_cache,
    clear_network_cache,
};

static RUNTIME: Lazy<Runtime> = Lazy::new(|| {
    Runtime::new().expect("[!] Failed to create Tokio runtime")
});

static SYSTEM_MONITOR: Lazy<Arc<modules::system_monitor::SystemMonitor>> = Lazy::new(|| {
    log_info!("Creating global SystemMonitor instance");
    Arc::new(modules::system_monitor::SystemMonitor::new())
});

#[macro_export]
macro_rules! log_info {
    ($($arg:tt)*) => {
        log::info!($($arg)*)
    }
}

#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => {
        log::error!($($arg)*)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log_info!("Starting Meridian Network Tool");

    RUNTIME.block_on(async {
        log_info!("Initializing network monitor...");
        let network_monitor = Arc::new(modules::network_monitor::NetworkMonitor::new());

        log_info!("Starting system monitoring task...");
        modules::system_monitor::start_monitoring(Arc::clone(&SYSTEM_MONITOR));
        log_info!("Starting network monitoring task...");
        modules::network_monitor::start_monitoring(Arc::clone(&network_monitor));
        log_info!("Background tasks initialized");
    });

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        use tauri_plugin_window_state::Builder;
        builder = builder.plugin(Builder::default().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            get_processes,
            throttle_process,
            unthrottle_process,
            get_network_usage,
            clear_all_cache,
            clear_process_cache,
            clear_network_cache
        ])
        .setup(|_app| {
            log_info!("Tauri application initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
