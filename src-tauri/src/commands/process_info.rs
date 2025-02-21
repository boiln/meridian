use crate::{log_info, SYSTEM_MONITOR};
use crate::models::ApplicationProcess;

// Get a list of all processes with their network usage
#[tauri::command]
pub async fn get_processes() -> Result<Vec<ApplicationProcess>, String> {
    let processes = SYSTEM_MONITOR.get_processes();
    processes.iter().filter(|p| p.status == crate::models::ProcessStatus::Online).count();
    processes.iter().filter(|p| p.status == crate::models::ProcessStatus::Offline).count();

    if processes.is_empty() {
        log_info!("No processes found!");
    }

    Ok(processes)
}