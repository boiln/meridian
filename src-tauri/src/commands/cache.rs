use crate::SYSTEM_MONITOR;
use tauri::command;

fn clear_cache_and_rescan<F>(clear_fn: F)
where
    F: FnOnce(&crate::modules::system_monitor::SystemMonitor)
{
    clear_fn(&SYSTEM_MONITOR);
    // force rescan
    SYSTEM_MONITOR.get_processes();
}

#[command]
pub async fn clear_all_cache() {
    clear_cache_and_rescan(|monitor| monitor.clear_all_cache());
}

#[command]
pub async fn clear_process_cache() {
    clear_cache_and_rescan(|monitor| monitor.clear_process_cache());
}

#[command]
pub async fn clear_network_cache() {
    clear_cache_and_rescan(|monitor| monitor.clear_network_cache());
} 