// prevents additional console window on windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use meridian_lib::init_logger;
use meridian_lib::log_info;
use windows::Win32::System::Com::{CoInitializeEx, COINIT_APARTMENTTHREADED};

const RPC_E_CHANGED_MODE: i32 = 0x80010106u32 as i32;

fn main() {
    init_logger();

    unsafe {
        match CoInitializeEx(None, COINIT_APARTMENTTHREADED) {
            Ok(_) => {
                log_info!("COM initialized successfully in single-threaded apartment mode");
            },
            Err(error) => {
                if error.code().0 == RPC_E_CHANGED_MODE {
                    log_info!("COM already initialized with different threading model, continuing...");
                } else {
                    log_info!("Failed to initialize COM: {:?}", error);
                }
            }
        }
    }

    meridian_lib::run();
}
