use serde::{Deserialize, Serialize};

pub const PROCESS_SCAN_INTERVAL_MS: u64 = 1000;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum ProcessStatus {
    Online,
    Offline,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkUsage {
    pub value: f64,
    pub unit: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessNetworkUsage {
    pub download: NetworkUsage,
    pub upload: NetworkUsage,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApplicationProcess {
    pub id: i32,
    pub name: String,
    pub display_name: Option<String>,
    pub path: String,
    pub icon: Option<String>,
    pub network_usage: ProcessNetworkUsage,
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub children: Vec<u32>,
    pub status: ProcessStatus,
    pub is_system: bool,
    pub category: String,
}