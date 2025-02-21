use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use crate::log_info;

// thread-safe storage
static THROTTLED_PROCESSES: Lazy<Arc<RwLock<HashMap<u32, (u64, u64)>>>> = Lazy::new(|| {
    Arc::new(RwLock::new(HashMap::new()))
});

#[tauri::command]
pub async fn throttle_process(pid: u32, download_limit: u64, upload_limit: u64) -> Result<(), String> {
    log_info!("Throttling process {} (down: {} KB/s, up: {} KB/s)", pid, download_limit, upload_limit);
    THROTTLED_PROCESSES.write().insert(pid, (download_limit, upload_limit));
    
    // TODO: Implement actual network throttling using Windows API
    // This will require additional setup with the Windows Network Controller
    
    Ok(())
}

#[tauri::command]
pub async fn unthrottle_process(pid: u32) -> Result<(), String> {
    log_info!("Removing throttling for process {}", pid);
    
    if THROTTLED_PROCESSES.write().remove(&pid).is_some() {
        // TODO: Implement actual network throttling removal using Windows API
        // this will require additional setup with the Windows Network Controller
    }
    
    Ok(())
}