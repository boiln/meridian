use std::sync::Arc;
use tokio::time::{interval, Duration};
use sysinfo::{System, SystemExt, Process, ProcessExt, PidExt};
use crate::models::{ApplicationProcess, ProcessStatus, ProcessNetworkUsage, NetworkUsage};
use crate::cache::{ProcessCache, NetworkCache, traits::Cache};
use crate::{log_info, log_error};
use crate::models::PROCESS_SCAN_INTERVAL_MS;
use std::collections::HashSet;
use parking_lot::RwLock;
use crate::modules::process_metadata::get_process_metadata;
use netstat2;
use std::collections::HashMap;

pub struct SystemMonitor {
    process_cache: Arc<ProcessCache>,
    network_cache: Arc<NetworkCache>,
    system: Arc<RwLock<System>>,
    last_process_list: Arc<RwLock<HashSet<u32>>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_all();
        
        Self {
            process_cache: Arc::new(ProcessCache::new()),
            network_cache: Arc::new(NetworkCache::new()),
            system: Arc::new(RwLock::new(system)),
            last_process_list: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub fn get_processes(&self) -> Vec<ApplicationProcess> {
        let processes = self.process_cache.get_all_processes();
        processes
    }

    fn has_network_capabilities(&self, process: &Process, exe_path: &str) -> bool {
        if let Some(network_usage) = self.network_cache.get_usage(process.pid().as_u32()) {
            if network_usage.download.value > 0.0 || network_usage.upload.value > 0.0 {
                return true;
            }
        }

        let exe_lower = exe_path.to_lowercase();
        let name_lower = process.name().to_lowercase();

        let network_indicators = [
            "chrome", "firefox", "edge", "opera", "brave",  // browser
            "discord", "slack", "teams", "zoom", "skype",   // communication
            "outlook", "thunderbird",                       // email
            "steam", "epic games", "battle.net",            // games
            "spotify", "netflix",                           // media
            "curl", "wget", "postman",                      // network tools
            "node", "python", "java", "ruby",               // development runtimes
            "nginx", "apache",                              // web server
            "vpn", "remote", "ssh", "ftp", "torrent"        // network utility
        ];

        if network_indicators.iter().any(|&indicator| {
            name_lower.contains(indicator) || exe_lower.contains(indicator)
        }) {
            return true;
        }

        // check if process has any open network connections
        if let Ok(sockets) = netstat2::get_sockets_info(
            netstat2::AddressFamilyFlags::IPV4 | netstat2::AddressFamilyFlags::IPV6,
            netstat2::ProtocolFlags::TCP | netstat2::ProtocolFlags::UDP
        ) {
            if sockets.iter().any(|socket| {
                socket.associated_pids.first()
                    .map(|&pid| pid as u32 == process.pid().as_u32())
                    .unwrap_or(false)
            }) {
                return true;
            }
        }

        false
    }

    async fn update_processes(&self) {
        {
            let mut system = self.system.write();
            system.refresh_all();
            
            let current_pids: HashSet<u32> = system.processes()
                .iter()
                .map(|(pid, _)| pid.as_u32())
                .collect();
            
            log_info!("Found {} PIDs in system", current_pids.len());

            let needs_full_update = {
                let last_pids = self.last_process_list.read();
                current_pids != *last_pids
            };

            if !needs_full_update {
                for pid in current_pids.iter() {
                    if let Some(process) = system.process(sysinfo::Pid::from(*pid as usize)) {
                        if let Some(mut cached_process) = self.process_cache.get_process(*pid) {
                            if self.has_network_capabilities(process, &process.exe().to_string_lossy()) {
                                let network_usage = self.network_cache.get_usage(*pid)
                                    .unwrap_or_else(|| ProcessNetworkUsage {
                                        download: NetworkUsage {
                                            value: 0.0,
                                            unit: "KB/s".to_string(),
                                        },
                                        upload: NetworkUsage {
                                            value: 0.0,
                                            unit: "KB/s".to_string(),
                                        },
                                    });
                                
                                cached_process.network_usage = network_usage.clone();
                                
                                if network_usage.download.value > 0.0 || network_usage.upload.value > 0.0 {
                                    cached_process.status = ProcessStatus::Online;
                                }
                                
                                self.process_cache.update_process(cached_process);
                            }
                        }
                    }
                }
                return;
            }

            log_info!("Performing full update for {} processes", current_pids.len());
            let mut updated_count = 0;
            let mut active_pids = Vec::new();
            let mut process_map = HashMap::new();
            let mut parent_map = HashMap::new();
            let mut name_parent_map = HashMap::new(); // Track name+parent combinations

            // First pass: collect all processes and their parent PIDs
            for (pid, process) in system.processes() {
                if process.name().to_lowercase() == "system idle process" {
                    continue;
                }

                let process_pid = pid.as_u32();
                let exe_path = process.exe().to_string_lossy().to_string();
                if exe_path.is_empty() {
                    log_error!("[Icon] Empty executable path for process {} ({})", process.name(), process_pid);
                    continue;
                }

                if !self.has_network_capabilities(process, &exe_path) {
                    continue;
                }

                // Check if we already have a process with this name and parent
                let parent_pid = process.parent().map(|p| p.as_u32());
                let name_parent_key = (process.name().to_string(), parent_pid);
                
                if let Some(&existing_pid) = name_parent_map.get(&name_parent_key) {
                    // If we already have a process with this name and parent, skip this one
                    // unless it has more network activity
                    if let Some(existing_usage) = self.network_cache.get_usage(existing_pid) {
                        if let Some(current_usage) = self.network_cache.get_usage(process_pid) {
                            if current_usage.download.value <= existing_usage.download.value &&
                               current_usage.upload.value <= existing_usage.upload.value {
                                continue;
                            }
                        } else {
                            continue;
                        }
                    }
                }
                
                name_parent_map.insert(name_parent_key, process_pid);

                let network_usage = self.network_cache
                    .get_usage(process_pid)
                    .unwrap_or_else(|| ProcessNetworkUsage {
                        download: NetworkUsage {
                            value: 0.0,
                            unit: "KB/s".to_string(),
                        },
                        upload: NetworkUsage {
                            value: 0.0,
                            unit: "KB/s".to_string(),
                        },
                    });

                let metadata = get_process_metadata(&exe_path);

                let has_active_connections = if let Ok(sockets) = netstat2::get_sockets_info(
                    netstat2::AddressFamilyFlags::IPV4 | netstat2::AddressFamilyFlags::IPV6,
                    netstat2::ProtocolFlags::TCP | netstat2::ProtocolFlags::UDP
                ) {
                    sockets.iter().any(|socket| {
                        socket.associated_pids.first()
                            .map(|&pid| pid as u32 == process_pid)
                            .unwrap_or(false)
                    })
                } else {
                    false
                };

                let status = if network_usage.download.value > 0.0 
                    || network_usage.upload.value > 0.0 
                    || has_active_connections {
                    ProcessStatus::Online
                } else {
                    ProcessStatus::Offline
                };

                let app_process = ApplicationProcess {
                    id: process_pid as i32,
                    name: process.name().to_string(),
                    display_name: metadata.display_name,
                    path: exe_path.clone(),
                    icon: metadata.icon_base64,
                    network_usage: network_usage.clone(),
                    pid: process_pid,
                    parent_pid: process.parent().map(|p| p.as_u32()),
                    children: Vec::new(),
                    status,
                    is_system: process.name().to_lowercase().contains("system")
                        || process.name().to_lowercase().contains("svchost")
                        || exe_path.to_lowercase().contains("\\windows\\"),
                    category: self.determine_process_category(process, &network_usage),
                };

                if let Some(parent_pid) = app_process.parent_pid {
                    parent_map.insert(process_pid, parent_pid);
                }

                process_map.insert(process_pid, app_process);
                active_pids.push(process_pid);
            }

            // Second pass: build child relationships
            for (&pid, parent_pid) in &parent_map {
                if let Some(parent_process) = process_map.get_mut(parent_pid) {
                    parent_process.children.push(pid);
                }
            }

            // Update cache with processes that have complete parent-child relationships
            for (_, process) in process_map {
                self.process_cache.update_process(process);
                updated_count += 1;
            }

            // cleanup processes and maintaining order
            self.process_cache.cleanup_inactive_processes(&active_pids);

            log_info!("Updated {} network-capable processes in cache", updated_count);
            *self.last_process_list.write() = current_pids.clone();
        }
    }

    fn determine_process_category(&self, process: &Process, network_usage: &ProcessNetworkUsage) -> String {
        if network_usage.download.value > 0.0 || network_usage.upload.value > 0.0 {
            if process.name().to_lowercase().contains("svchost")
                || process.name().to_lowercase().contains("system")
                || process.name().to_lowercase().contains("service") {
                "LocalNetwork".to_string()
            } else {
                "Internet".to_string()
            }
        } else {
            "LocalNetwork".to_string()
        }
    }

    pub fn clear_all_cache(&self) {
        self.process_cache.as_ref().clear();
        self.network_cache.as_ref().clear();
        log_info!("All caches cleared");
    }

    pub fn clear_process_cache(&self) {
        self.process_cache.as_ref().clear();
        log_info!("Process cache cleared");
    }

    pub fn clear_network_cache(&self) {
        self.network_cache.as_ref().clear();
        log_info!("Network cache cleared");
    }

    pub fn get_network_cache(&self) -> &Arc<NetworkCache> {
        &self.network_cache
    }
}

pub fn start_monitoring(monitor: Arc<SystemMonitor>) {
    tokio::spawn(async move {
        let mut interval = interval(Duration::from_millis(PROCESS_SCAN_INTERVAL_MS));

        loop {
            interval.tick().await;
            monitor.update_processes().await;
        }
    });

    log_info!("Started system monitoring task");
}