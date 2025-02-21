use std::collections::HashMap;
use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, Ordering};
use crate::models::{
    ApplicationProcess,
    ProcessNetworkUsage
};
use crate::log_info;
use crate::cache::traits::Cache;

// thread-safe cache
pub struct NetworkCache {
    processes: RwLock<HashMap<u32, ApplicationProcess>>,
    is_clearing: AtomicBool,
}

impl Cache for NetworkCache {
    fn cache_name(&self) -> &str {
        "Network"
    }

    fn clear(&self) {
        self.is_clearing.store(true, Ordering::SeqCst);
        self.processes.write().clear();
        self.is_clearing.store(false, Ordering::SeqCst);
        self.log_clear();
    }
}

impl NetworkCache {
    pub fn new() -> Self {
        Self {
            processes: RwLock::new(HashMap::new()),
            is_clearing: AtomicBool::new(false),
        }
    }

    // get network usage for a process
    pub fn get_usage(&self, pid: u32) -> Option<ProcessNetworkUsage> {
        let processes = self.processes.read();
        processes.get(&pid).map(|process| process.network_usage.clone())
    }

    pub fn update_process(&self, process: ApplicationProcess) {
        if self.is_clearing.load(Ordering::SeqCst) {
            return;
        }

        let mut processes = self.processes.write();
        processes.insert(process.pid, process);
    }

    pub fn get_all_processes(&self) -> Vec<ApplicationProcess> {
        if self.is_clearing.load(Ordering::SeqCst) {
            return Vec::new();
        }

        let processes = self.processes.read();
        let process_count = processes.len();
        
        if process_count == 0 {
            log_info!("WARNING: Cache is empty!");
        }
        
        processes.values().cloned().collect()
    }

    pub fn cleanup_inactive(&self, active_pids: &[u32]) {
        if self.is_clearing.load(Ordering::SeqCst) {
            return;
        }

        let processes_before = self.processes.read().len();
        
        let mut processes = self.processes.write();
        
        processes.retain(|&pid, process| {
            let is_active = active_pids.contains(&pid);
            let has_traffic = process.network_usage.download.value > 0.01 || 
                            process.network_usage.upload.value > 0.01;
            
            is_active || has_traffic
        });
        
        let processes_after = processes.len();
        if processes_before != processes_after {
            log_info!("Cleaned up inactive processes. Before: {}, After: {}", 
                processes_before, 
                processes_after
            );
        }
    }
}

impl Default for NetworkCache {
    fn default() -> Self {
        Self::new()
    }
}