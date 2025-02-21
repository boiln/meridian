use std::collections::HashMap;
use parking_lot::RwLock;
use crate::models::ApplicationProcess;
use crate::log_info;
use crate::cache::traits::Cache;

// thread-safe cache
pub struct ProcessCache {
    processes: RwLock<HashMap<u32, ApplicationProcess>>,
    process_order: RwLock<Vec<u32>>,
}

impl Cache for ProcessCache {
    fn cache_name(&self) -> &str {
        "Process"
    }

    fn clear(&self) {
        self.processes.write().clear();
        self.process_order.write().clear();
        self.log_clear();
    }
}

impl ProcessCache {
    pub fn new() -> Self {
        log_info!("Creating new ProcessCache");
        Self {
            processes: RwLock::new(HashMap::new()),
            process_order: RwLock::new(Vec::new()),
        }
    }

    pub fn update_process(&self, process: ApplicationProcess) {
        let pid = process.pid;
        let mut processes = self.processes.write();
        let mut order = self.process_order.write();
        
        if !processes.contains_key(&pid) {
            order.push(pid);
        }
        
        processes.insert(pid, process);
    }

    pub fn get_process(&self, pid: u32) -> Option<ApplicationProcess> {
        self.processes.read().get(&pid).cloned()
    }

    pub fn get_all_processes(&self) -> Vec<ApplicationProcess> {
        let processes = self.processes.read();
        let order = self.process_order.read();
        
        order.iter()
            .filter_map(|&pid| processes.get(&pid).cloned())
            .collect()
    }

    pub fn cleanup_inactive_processes(&self, active_pids: &[u32]) {
        let active_set: std::collections::HashSet<_> = active_pids.iter().copied().collect();
        
        let mut processes = self.processes.write();
        let mut order = self.process_order.write();
        
        processes.retain(|&pid, _| active_set.contains(&pid));
        
        order.retain(|&pid| active_set.contains(&pid));
    }
}

impl Default for ProcessCache {
    fn default() -> Self {
        Self::new()
    }
} 