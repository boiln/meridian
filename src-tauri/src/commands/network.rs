use crate::SYSTEM_MONITOR;
use crate::models::{NetworkUsage, ProcessNetworkUsage};

#[tauri::command]
pub async fn get_network_usage() -> Result<ProcessNetworkUsage, String> {
    // Get network data directly from network cache
    let network_cache = SYSTEM_MONITOR.get_network_cache();
    let processes = network_cache.get_all_processes(); // Get all processes including those with low traffic
    
    let mut total_download = 0.0;
    let mut total_upload = 0.0;

    for process in &processes {
        total_download += process.network_usage.download.value;
        total_upload += process.network_usage.upload.value;
    }
    
    let usage = ProcessNetworkUsage {
        download: NetworkUsage {
            value: total_download,
            unit: "KB/s".to_string(),
        },
        upload: NetworkUsage {
            value: total_upload,
            unit: "KB/s".to_string(),
        },
    };

    Ok(usage)
} 