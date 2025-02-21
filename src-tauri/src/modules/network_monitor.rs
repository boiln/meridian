use std::sync::Arc;
use tokio::time::{interval, Duration};
use windows::Win32::NetworkManagement::IpHelper::{
    GetTcpTable2, MIB_TCPTABLE2, MIB_TCPROW2,
    MIB_TCP_STATE_ESTAB,
};
use windows::Win32::Foundation::{HANDLE, TRUE};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
use crate::models::{
    ProcessStatus, ApplicationProcess, 
    ProcessNetworkUsage, NetworkUsage
};
use crate::log_info;
use crate::SYSTEM_MONITOR;
use std::collections::HashMap;
use parking_lot::RwLock;
use pcap::{Device, Capture};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::time::Instant;
use tokio::sync::mpsc;
use get_if_addrs;
use sysinfo::{System, SystemExt, ProcessExt, PidExt};

struct ProcessTraffic {
    bytes_sent: u64,
    bytes_received: u64,
    last_update: std::time::Instant,
    active_connections: HashMap<String, ConnectionInfo>,
    current_upload_rate: f64,
    current_download_rate: f64,
}

impl Default for ProcessTraffic {
    fn default() -> Self {
        Self {
            bytes_sent: 0,
            bytes_received: 0,
            last_update: std::time::Instant::now(),
            active_connections: HashMap::new(),
            current_upload_rate: 0.0,
            current_download_rate: 0.0,
        }
    }
}

struct ConnectionInfo {
    local_addr: IpAddr,
    local_port: u16,
    remote_addr: IpAddr,
    remote_port: u16,
    bytes_sent: u64,
    bytes_received: u64,
}

struct PacketData {
    source_addr: IpAddr,
    source_port: u16,
    dest_addr: IpAddr,
    dest_port: u16,
    length: u64,
}

// track per process
pub struct NetworkMonitor {
    process_traffic: Arc<RwLock<HashMap<u32, ProcessTraffic>>>,
    packet_receiver: RwLock<Option<mpsc::Receiver<PacketData>>>,
    system: RwLock<System>,
}

impl NetworkMonitor {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel(1024);
        
        let mut system = System::new_all();
        system.refresh_all();
        
        let monitor = Self {
            process_traffic: Arc::new(RwLock::new(HashMap::new())),
            packet_receiver: RwLock::new(Some(rx)),
            system: RwLock::new(system),
        };

        let sender = tx;
        std::thread::spawn(move || {
            let is_admin = unsafe {
                use windows::Win32::System::Threading::{OpenProcessToken, GetCurrentProcess};
                use windows::Win32::Security::{TOKEN_QUERY, TOKEN_ADJUST_PRIVILEGES};
                
                let mut token_handle = HANDLE::default();
                let token_ptr = &mut token_handle as *mut HANDLE;
                
                OpenProcessToken(
                    GetCurrentProcess(),
                    TOKEN_QUERY | TOKEN_ADJUST_PRIVILEGES,
                    token_ptr,
                ).as_bool() && !token_handle.is_invalid()
            };

            if !is_admin {
                log_info!("WARNING: Application is not running with administrator privileges. Packet capture may fail.");
            }

            log_info!("Initializing network capture...");
            
            match Device::list() {
                Ok(devices) => {
                    log_info!("Successfully listed {} network devices", devices.len());
                    
                    if devices.is_empty() {
                        log_info!("No network devices found. Is WinPcap installed?");
                        return;
                    }

                    for device in devices.iter() {
                        log_info!("Available device: {} (Description: {:?})", 
                            device.name, 
                            device.desc.as_ref().unwrap_or(&"No description".to_string())
                        );
                        log_info!("  Flags: {:?}", device.flags);
                    }

                    if let Some(device) = find_best_device() {
                        log_info!("Creating packet capture for device: {}", device.name);
                        
                        let capture_result = Capture::from_device(device.clone())
                            .map_err(|e| {
                                log_info!("Failed to create capture from device: {}", e);
                                e
                            })
                            .and_then(|capture| {
                                log_info!("Setting up capture parameters...");
                                capture
                                    .promisc(true)
                                    .snaplen(65535)
                                    .buffer_size(32 * 1024 * 1024) // 32mb buffer
                                    .timeout(1000)
                                    .immediate_mode(true)
                                    .open()
                                    .map_err(|e| {
                                        log_info!("Failed to open capture with parameters: {}", e);
                                        e
                                    })
                            });

                        match capture_result {
                            Ok(mut capture) => {
                                log_info!("Successfully opened capture on device {}", device.name);
                                
                                let local_ips = get_local_ip_addresses();
                                let ip_conditions: Vec<String> = local_ips.iter()
                                    .map(|ip| format!("host {}", ip))
                                    .collect();
                                let ip_filter = if !ip_conditions.is_empty() {
                                    format!("({}) and ", ip_conditions.join(" or "))
                                } else {
                                    String::new()
                                };

                                let filter = format!("{}ip and not broadcast and not multicast", ip_filter);
                                
                                match capture.filter(&filter, true) {
                                    Ok(_) => {
                                        log_info!("Successfully set capture filter '{}' on device {}", filter, device.name);
                                    }
                                    Err(e) => {
                                        log_info!("Warning: Failed to set capture filter: {}", e);
                                        log_info!("Continuing without filter...");
                                    }
                                }

                                let rt = tokio::runtime::Runtime::new().unwrap();
                                rt.block_on(async {
                                    log_info!("Starting packet capture loop...");
                                    let mut packet_count = 0;
                                    let mut last_log = Instant::now();
                                    let mut consecutive_errors = 0;
                                    
                                    loop {
                                        match capture.next_packet() {
                                            Ok(packet) => {
                                                consecutive_errors = 0;
                                                packet_count += 1;
                                                let now = Instant::now();
                                                
                                                if now.duration_since(last_log).as_secs() >= 5 {
                                                    log_info!("Processed {} packets in last 5 seconds", packet_count);
                                                    packet_count = 0;
                                                    last_log = now;
                                                }
                                                
                                                if let Some(ethernet) = etherparse::SlicedPacket::from_ethernet(packet.data).ok() {
                                                    if let Some(ip) = ethernet.ip {
                                                        let packet_data = match ip {
                                                            etherparse::InternetSlice::Ipv4(ipv4_header, _) => {
                                                                match ethernet.transport {
                                                                    Some(etherparse::TransportSlice::Tcp(ref tcp)) => {
                                                                        Some(PacketData {
                                                                            source_addr: IpAddr::V4(Ipv4Addr::from(ipv4_header.source())),
                                                                            source_port: tcp.source_port(),
                                                                            dest_addr: IpAddr::V4(Ipv4Addr::from(ipv4_header.destination())),
                                                                            dest_port: tcp.destination_port(),
                                                                            length: packet.header.len as u64,
                                                                        })
                                                                    },
                                                                    Some(etherparse::TransportSlice::Udp(ref udp)) => Some(PacketData {
                                                                        source_addr: IpAddr::V4(Ipv4Addr::from(ipv4_header.source())),
                                                                        source_port: udp.source_port(),
                                                                        dest_addr: IpAddr::V4(Ipv4Addr::from(ipv4_header.destination())),
                                                                        dest_port: udp.destination_port(),
                                                                        length: packet.header.len as u64,
                                                                    }),
                                                                    _ => None,
                                                                }
                                                            },
                                                            etherparse::InternetSlice::Ipv6(ipv6_header, _) => {
                                                                match ethernet.transport {
                                                                    Some(etherparse::TransportSlice::Tcp(ref tcp)) => Some(PacketData {
                                                                        source_addr: IpAddr::V6(Ipv6Addr::from(ipv6_header.source())),
                                                                        source_port: tcp.source_port(),
                                                                        dest_addr: IpAddr::V6(Ipv6Addr::from(ipv6_header.destination())),
                                                                        dest_port: tcp.destination_port(),
                                                                        length: packet.header.len as u64,
                                                                    }),
                                                                    Some(etherparse::TransportSlice::Udp(ref udp)) => Some(PacketData {
                                                                        source_addr: IpAddr::V6(Ipv6Addr::from(ipv6_header.source())),
                                                                        source_port: udp.source_port(),
                                                                        dest_addr: IpAddr::V6(Ipv6Addr::from(ipv6_header.destination())),
                                                                        dest_port: udp.destination_port(),
                                                                        length: packet.header.len as u64,
                                                                    }),
                                                                    _ => None,
                                                                }
                                                            }
                                                        };

                                                        if let Some(data) = packet_data {
                                                            let _ = sender.send(data).await;
                                                        }
                                                    }
                                                }
                                            },
                                            Err(e) => {
                                                consecutive_errors += 1;
                                                
                                                if !e.to_string().contains("timeout") {
                                                    log_info!("Error receiving packet: {}", e);
                                                }

                                                if consecutive_errors > 100 {
                                                    log_info!("Too many consecutive errors, attempting to reset capture...");
                                                    break;
                                                }
                                                
                                                tokio::time::sleep(Duration::from_millis(100)).await;
                                            }
                                        }
                                    }
                                    
                                    log_info!("Packet capture loop ended, device may need to be reinitialized");
                                });
                            },
                            Err(e) => {
                                log_info!("Failed to open capture device: {}", e);
                            }
                        }
                    }
                },
                Err(e) => {
                    log_info!("Failed to list network devices: {}", e);
                }
            }
        });

        monitor
    }

    // Process received packets and update traffic statistics
    async fn process_packets(&self) {
        if let Some(mut receiver) = self.packet_receiver.write().take() {
            while let Some(packet) = receiver.recv().await {
                let connection = ConnectionInfo {
                    local_addr: packet.source_addr,
                    local_port: packet.source_port,
                    remote_addr: packet.dest_addr,
                    remote_port: packet.dest_port,
                    bytes_sent: 0,
                    bytes_received: 0,
                };

                if let Some(pid) = self.get_process_for_connection(&connection) {
                    let mut traffic = self.process_traffic.write();
                    let process_traffic = traffic.entry(pid).or_default();
                    
                    let conn_key = format!("{}:{}-{}:{}", 
                        connection.local_addr, connection.local_port,
                        connection.remote_addr, connection.remote_port);

                    let conn_info = process_traffic.active_connections
                        .entry(conn_key)
                        .or_insert_with(|| connection);

                    let now = Instant::now();
                    let time_delta = now.duration_since(process_traffic.last_update).as_secs_f64();

                    let is_local_source = match packet.source_addr {
                        IpAddr::V4(addr) => is_local_ipv4(&addr),
                        IpAddr::V6(addr) => is_local_ipv6(&addr),
                    };

                    if is_local_source {
                        conn_info.bytes_sent += packet.length;
                        process_traffic.bytes_sent += packet.length;
                        
                        let instant_rate = (packet.length as f64 / 1024.0) / time_delta.max(0.05);
                        process_traffic.current_upload_rate = process_traffic.current_upload_rate * 0.6 + instant_rate * 0.4;
                    } else {
                        conn_info.bytes_received += packet.length;
                        process_traffic.bytes_received += packet.length;
                        
                        let instant_rate = (packet.length as f64 / 1024.0) / time_delta.max(0.05);
                        process_traffic.current_download_rate = process_traffic.current_download_rate * 0.6 + instant_rate * 0.4;
                    }
                    process_traffic.last_update = now;
                } else {
                    if packet.length > 1024 {
                        log_info!(
                            "No process found for connection {}:{} -> {}:{}",
                            packet.source_addr,
                            packet.source_port,
                            packet.dest_addr,
                            packet.dest_port
                        );
                    }
                }
            }
            *self.packet_receiver.write() = Some(receiver);
        }
    }

    // Map network connection to process ID using GetTcpTable2
    fn get_process_for_connection(&self, connection: &ConnectionInfo) -> Option<u32> {
        unsafe {
            let mut table_size: u32 = 0;
            let mut result = GetTcpTable2(
                None,
                &mut table_size,
                TRUE,
            );

            if result != 0 && result != 122 { // ERROR_INSUFFICIENT_BUFFER = 122
                log_info!("Failed to get TCP table size: error {}", result);
                return None;
            }

            let mut buffer = vec![0u8; table_size as usize];
            result = GetTcpTable2(
                Some(buffer.as_mut_ptr() as *mut MIB_TCPTABLE2),
                &mut table_size,
                TRUE,
            );

            if result != 0 {
                log_info!("Failed to get TCP table: error {}", result);
                return None;
            }

            let table = &*(buffer.as_ptr() as *const MIB_TCPTABLE2);
            let num_entries = table.dwNumEntries as usize;

            let table_ptr = buffer.as_ptr().add(std::mem::size_of::<u32>()) as *const MIB_TCPROW2;
            let entries = std::slice::from_raw_parts(table_ptr, num_entries);

            let local_addr = match connection.local_addr {
                IpAddr::V4(addr) => u32::from_be_bytes(addr.octets()),
                _ => return None,
            };
            let remote_addr = match connection.remote_addr {
                IpAddr::V4(addr) => u32::from_be_bytes(addr.octets()),
                _ => return None,
            };

            let _local_port = connection.local_port.to_be();
            let _remote_port = connection.remote_port.to_be();

            for entry in entries {
                if entry.dwState != MIB_TCP_STATE_ESTAB.0 as u32 {
                    continue;
                }

                let forward_match = entry.dwLocalAddr == local_addr.to_be() && 
                                  entry.dwRemoteAddr == remote_addr.to_be();

                let reverse_match = entry.dwLocalAddr == remote_addr.to_be() && 
                                  entry.dwRemoteAddr == local_addr.to_be();

                if forward_match || reverse_match {
                    return Some(entry.dwOwningPid);
                }
            }
        }
        None
    }

    fn get_process_info(&self, pid: u32) -> Option<ProcessInfo> {
        let mut system = self.system.write();
        system.refresh_process(sysinfo::Pid::from(pid as usize));
        
        if let Some(process) = system.process(sysinfo::Pid::from(pid as usize)) {
            let exe_path = process.exe().to_string_lossy().to_string();
            Some(ProcessInfo {
                name: process.name().to_string(),
                display_name: None, // this will be filled by process_metadata if needed
                path: exe_path.clone(),
                icon: None, // this will be filled by process_metadata if needed
                parent_pid: process.parent().map(|p| p.as_u32()),
                is_system: process.name().to_lowercase().contains("system")
                    || process.name().to_lowercase().contains("svchost")
                    || exe_path.to_lowercase().contains("\\windows\\"),
                category: if process.name().to_lowercase().contains("svchost")
                    || process.name().to_lowercase().contains("system")
                    || process.name().to_lowercase().contains("service")
                {
                    "LocalNetwork".to_string()
                } else {
                    "Internet".to_string()
                },
            })
        } else {
            None
        }
    }

    fn update_process_stats(&self, pid: u32, download_kbps: f64, upload_kbps: f64, process: &ProcessInfo) {
        let process_info = ApplicationProcess {
            id: pid as i32,
            name: process.name.clone(),
            display_name: process.display_name.clone(),
            path: process.path.clone(),
            icon: process.icon.clone(),
            network_usage: ProcessNetworkUsage {
                download: NetworkUsage {
                    value: if download_kbps >= 1024.0 {
                        download_kbps / 1024.0
                    } else {
                        download_kbps
                    },
                    unit: if download_kbps >= 1024.0 {
                        "MB/s".to_string()
                    } else {
                        "KB/s".to_string()
                    },
                },
                upload: NetworkUsage {
                    value: if upload_kbps >= 1024.0 {
                        upload_kbps / 1024.0
                    } else {
                        upload_kbps
                    },
                    unit: if upload_kbps >= 1024.0 {
                        "MB/s".to_string()
                    } else {
                        "KB/s".to_string()
                    },
                },
            },
            pid,
            parent_pid: process.parent_pid,
            children: Vec::new(),
            status: if download_kbps > 0.0 || upload_kbps > 0.0 {
                ProcessStatus::Online
            } else {
                ProcessStatus::Offline
            },
            is_system: process.is_system,
            category: process.category.clone(),
        };

        SYSTEM_MONITOR.get_network_cache().update_process(process_info);
    }
}

struct ProcessInfo {
    name: String,
    display_name: Option<String>,
    path: String,
    icon: Option<String>,
    parent_pid: Option<u32>,
    is_system: bool,
    category: String,
}

pub fn start_monitoring(monitor: Arc<NetworkMonitor>) {
    let process_monitor = Arc::clone(&monitor);
    std::thread::spawn(move || {
        unsafe {
            if let Err(e) = CoInitializeEx(None, COINIT_MULTITHREADED) {
                log_info!("Failed to initialize COM in packet processing thread: {:?}", e)
            }
        }

        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut interval = interval(Duration::from_millis(10));
            loop {
                interval.tick().await;
                process_monitor.process_packets().await;
            }
        });
    });

    // thread for rate updates
    let update_monitor = Arc::clone(&monitor);
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut interval = interval(Duration::from_millis(50));
            loop {
                interval.tick().await;
                let mut traffic = update_monitor.process_traffic.write();
                let mut pids_to_remove = Vec::new();

                for (&pid, process_traffic) in traffic.iter_mut() {
                    let now = Instant::now();
                    let time_delta = now.duration_since(process_traffic.last_update).as_secs_f64();

                    if time_delta >= 0.05 {
                        process_traffic.current_download_rate *= 0.95;
                        process_traffic.current_upload_rate *= 0.95;

                        if process_traffic.current_download_rate < 0.01 && process_traffic.current_upload_rate < 0.01 {
                            pids_to_remove.push(pid);
                            continue;
                        }

                        if let Some(process) = update_monitor.get_process_info(pid) {
                            if process_traffic.current_download_rate >= 0.0 || process_traffic.current_upload_rate >= 0.0 {
                                update_monitor.update_process_stats(
                                    pid,
                                    process_traffic.current_download_rate,
                                    process_traffic.current_upload_rate,
                                    &process
                                );
                            }
                        }
                        process_traffic.last_update = now;
                    }
                }

                for pid in pids_to_remove {
                    traffic.remove(&pid);
                }

                // cleanup inactive processes
                let active_pids: Vec<u32> = traffic.keys().cloned().collect();
                SYSTEM_MONITOR.get_network_cache().cleanup_inactive(&active_pids);
            }
        });
    });

    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            loop {
                log_info!("Starting packet capture initialization...");
                
                let is_admin = unsafe {
                    use windows::Win32::System::Threading::{OpenProcessToken, GetCurrentProcess};
                    use windows::Win32::Security::{TOKEN_QUERY, TOKEN_ADJUST_PRIVILEGES};
                    
                    let mut token_handle = HANDLE::default();
                    let token_ptr = &mut token_handle as *mut HANDLE;
                    
                    OpenProcessToken(
                        GetCurrentProcess(),
                        TOKEN_QUERY | TOKEN_ADJUST_PRIVILEGES,
                        token_ptr,
                    ).as_bool() && !token_handle.is_invalid()
                };

                if !is_admin {
                    log_info!("WARNING: Application is not running with administrator privileges. Packet capture may fail.");
                }

                // init packet capture
                if let Some(device) = find_best_device() {
                    log_info!("Creating packet capture for device: {}", device.name);
                    
                    match initialize_packet_capture(&device).await {
                        Ok(_) => {
                            log_info!("Packet capture completed normally, restarting...");
                            tokio::time::sleep(Duration::from_secs(1)).await;
                        }
                        Err(e) => {
                            log_info!("Packet capture failed: {}. Restarting in 5 seconds...", e);
                            tokio::time::sleep(Duration::from_secs(5)).await;
                        }
                    }
                } else {
                    log_info!("WARNING: Application is not running with administrator privileges. Packet capture may fail.");
                }
            }
        });
    });

    log_info!("Started network monitoring task");
}

async fn initialize_packet_capture(device: &Device) -> Result<(), Box<dyn std::error::Error>> {
    let capture_result = Capture::from_device(device.clone())
        .map_err(|e| {
            log_info!("Failed to create capture from device: {}", e);
            e
        })
        .and_then(|capture| {
            log_info!("Setting up capture parameters...");
            capture
                .promisc(true)
                .snaplen(65535)
                .buffer_size(32 * 1024 * 1024)
                .timeout(1000)
                .immediate_mode(true)
                .open()
                .map_err(|e| {
                    log_info!("Failed to open capture with parameters: {}", e);
                    e
                })
        })?;

    let mut capture = capture_result;
    
    let local_ips = get_local_ip_addresses();
    let ip_conditions: Vec<String> = local_ips.iter()
        .map(|ip| format!("host {}", ip))
        .collect();
    let ip_filter = if !ip_conditions.is_empty() {
        format!("({}) and ", ip_conditions.join(" or "))
    } else {
        String::new()
    };

    let filter = format!("{}ip and not broadcast and not multicast", ip_filter);
    if let Err(e) = capture.filter(&filter, true) {
        log_info!("Warning: Failed to set capture filter: {}", e);
        log_info!("Continuing without filter...");
    }

    let mut packet_count = 0;
    let mut last_log = Instant::now();
    let mut consecutive_errors = 0;
    
    loop {
        match capture.next_packet() {
            Ok(_packet) => {
                consecutive_errors = 0;
                packet_count += 1;
                let now = Instant::now();
                
                if now.duration_since(last_log).as_secs() >= 5 {
                    log_info!("Processed {} packets in last 5 seconds", packet_count);
                    if packet_count == 0 {
                        return Err("No packets received".into());
                    }
                    packet_count = 0;
                    last_log = now;
                }
            },
            Err(e) => {
                consecutive_errors += 1;
                
                if !e.to_string().contains("timeout") {
                    log_info!("Error receiving packet: {}", e);
                }

                if consecutive_errors > 100 {
                    return Err("Too many consecutive errors".into());
                }
                
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
        }
    }
}

fn find_best_device() -> Option<Device> {
    if cfg!(windows) {
        let wpcap_paths = [
            "C:\\Windows\\System32\\wpcap.dll",
            "C:\\Windows\\SysWOW64\\wpcap.dll",
            "C:\\Windows\\System32\\Packet.dll",
            "C:\\Windows\\SysWOW64\\Packet.dll"
        ];
        
        let found_wpcap = wpcap_paths.iter().any(|path| std::path::Path::new(path).exists());
        if !found_wpcap {
            log_info!("ERROR: WinPcap installation not found. Please install WinPcap from https://www.winpcap.org/");
            return None;
        }
    }

    match Device::list() {
        Ok(devices) => {
            log_info!("Found {} network devices", devices.len());
            
            if devices.is_empty() {
                log_info!("No network devices found. Is WinPcap installed?");
                return None;
            }

            let local_ips = get_local_ip_addresses();
            
            let matching_device = devices.iter().find(|d| {
                for addr in &d.addresses {
                    if let IpAddr::V4(ip) = addr.addr {
                        if local_ips.contains(&IpAddr::V4(ip)) {
                            return true;
                        }
                    }
                }
                false
            });

            if let Some(device) = matching_device {
                log_info!("Selected device matching our local IP: {} (Description: {:?})", device.name, device.desc);
                return Some(device.clone());
            }

            let ethernet_device = devices.iter().find(|d| {
                let desc = d.desc.as_ref().map(|s| s.to_lowercase()).unwrap_or_default();
                let name_lower = d.name.to_lowercase();
                
                let is_ethernet = (desc.contains("ethernet") || 
                                !desc.contains("wireless") && !desc.contains("wi-fi") && !desc.contains("wlan")) &&
                                !desc.contains("virtual") && 
                                !desc.contains("vm") &&
                                !name_lower.contains("virtual") &&
                                !name_lower.contains("vm");

                let has_addresses = !d.addresses.is_empty();
                !d.name.contains("loopback") && has_addresses && is_ethernet
            });

            if let Some(device) = ethernet_device {
                log_info!("Selected ethernet device: {} (Description: {:?})", device.name, device.desc);
                return Some(device.clone());
            }

            let wireless_device = devices.iter().find(|d| {
                let desc = d.desc.as_ref().map(|s| s.to_lowercase()).unwrap_or_default();
                let name_lower = d.name.to_lowercase();
                
                let is_wireless = (desc.contains("wi-fi") || 
                                desc.contains("wireless") ||
                                desc.contains("wlan") ||
                                desc.contains("802.11") ||
                                name_lower.contains("wlan") ||
                                desc.contains("microsoft wi-fi")) && 
                                !desc.contains("virtual") && 
                                !desc.contains("vm");

                let has_addresses = !d.addresses.is_empty();
                !d.name.contains("loopback") && has_addresses && is_wireless
            });

            if let Some(device) = wireless_device {
                log_info!("Selected wireless device: {} (Description: {:?})", device.name, device.desc);
                return Some(device.clone());
            }

            log_info!("ERROR: No suitable network device found. Please check that:");
            log_info!("1. You have WinPcap installed (https://www.winpcap.org/)");
            log_info!("2. You are running the application as administrator");
            log_info!("3. Your network adapters are properly configured");
            None
        },
        Err(e) => {
            log_info!("ERROR: Failed to list network devices: {}", e);
            log_info!("Please make sure:");
            log_info!("1. WinPcap is installed (https://www.winpcap.org/)");
            log_info!("2. You are running as administrator");
            None
        }
    }
}

// Get all local IP addresses
fn get_local_ip_addresses() -> Vec<IpAddr> {
    let mut addresses = Vec::new();
    
    if let Ok(interfaces) = get_if_addrs::get_if_addrs() {
        for interface in interfaces {
            if !interface.is_loopback() {
                addresses.push(interface.addr.ip());
            }
        }
    }
    
    if addresses.is_empty() {
        log_info!("No local IP addresses found!");
    }
    
    addresses
}

fn is_local_ipv4(addr: &Ipv4Addr) -> bool {
    if addr.is_loopback() {
        return true;
    }

    if addr.is_private() {
        return true;
    }

    if addr.is_link_local() {
        return true;
    }

    false
}

fn is_local_ipv6(addr: &Ipv6Addr) -> bool {
    if addr.is_loopback() {
        return true;
    }

    // check local address (fc00::/7)
    let octets = addr.octets();
    if (octets[0] & 0xfe) == 0xfc {
        return true;
    }

    // check link-local address (fe80::/10)
    if octets[0] == 0xfe && (octets[1] & 0xc0) == 0x80 {
        return true;
    }

    false
}