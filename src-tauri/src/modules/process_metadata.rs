use std::path::Path;
use std::sync::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use lazy_static::lazy_static;
use windows::Win32::UI::WindowsAndMessaging::{
    HICON, DestroyIcon,
};
use windows::Win32::UI::Shell::{
    SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON,
};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Graphics::Gdi::{
    BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS,
    BI_RGB,
};
use windows::Win32::Storage::FileSystem::GetFileVersionInfoSizeW;
use windows::Win32::Storage::FileSystem::GetFileVersionInfoW;
use windows::Win32::Storage::FileSystem::VerQueryValueW;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{ImageBuffer, Rgba};
use crate::log_error;

// Cache structure to store icons with timestamps
lazy_static! {
    static ref ICON_CACHE: Mutex<HashMap<String, (String, Option<String>, Instant)>> = Mutex::new(HashMap::new());
}

const ICON_CACHE_DURATION: Duration = Duration::from_secs(99999);

#[derive(Debug, Clone)]
pub struct ProcessMetadata {
    pub display_name: Option<String>,
    pub icon_base64: Option<String>,
}

pub fn get_process_metadata(exe_path: &str) -> ProcessMetadata {
    // Early return for empty paths
    if exe_path.is_empty() {
        return ProcessMetadata {
            display_name: None,
            icon_base64: None,
        };
    }

    // Check cache first
    if let Ok(cache) = ICON_CACHE.lock() {
        if let Some((cached_icon, cached_name, timestamp)) = cache.get(exe_path) {
            if timestamp.elapsed() < ICON_CACHE_DURATION {
                return ProcessMetadata {
                    display_name: cached_name.clone(),
                    icon_base64: Some(cached_icon.clone()),
                };
            }
        }
    }

    unsafe {
        if let Err(e) = CoInitializeEx(None, COINIT_MULTITHREADED) {
            log_error!("[Icon] Failed to initialize COM: {:?}", e);
            // continue even if com init fails, we might still get metadata
        }
    }

    let path = Path::new(exe_path);
    if !path.exists() {
        return ProcessMetadata {
            display_name: None,
            icon_base64: None,
        };
    }

    let wide_path: Vec<u16> = path.to_string_lossy()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();

    let mut file_info = SHFILEINFOW::default();
    let mut metadata = ProcessMetadata {
        display_name: None,
        icon_base64: None,
    };

    unsafe {
        let mut dummy = 0;
        let size = GetFileVersionInfoSizeW(PCWSTR(wide_path.as_ptr()), Some(&mut dummy));
        if size > 0 {
            let mut version_info = vec![0u8; size as usize];
            if GetFileVersionInfoW(
                PCWSTR(wide_path.as_ptr()),
                0,
                size,
                version_info.as_mut_ptr() as *mut _,
            ).as_bool() {
                let mut len = 0u32;
                let mut buffer: *mut std::ffi::c_void = std::ptr::null_mut();
                
                if VerQueryValueW(
                    version_info.as_ptr() as *const _,
                    PCWSTR("\\VarFileInfo\\Translation\0".encode_utf16().collect::<Vec<u16>>().as_ptr()),
                    &mut buffer,
                    &mut len,
                ).as_bool() && !buffer.is_null() && len > 0 {
                    let translations = std::slice::from_raw_parts(buffer as *const u16, len as usize / 2);
                    if translations.len() >= 2 {
                        let lang_id = translations[0];
                        let code_page = translations[1];
                        let query = format!("\\StringFileInfo\\{:04x}{:04x}\\ProductName\0", lang_id, code_page);
                        
                        if VerQueryValueW(
                            version_info.as_ptr() as *const _,
                            PCWSTR(query.encode_utf16().collect::<Vec<u16>>().as_ptr()),
                            &mut buffer,
                            &mut len,
                        ).as_bool() && !buffer.is_null() && len > 0 {
                            let product_name = PWSTR(buffer as *mut u16);
                            if let Ok(name) = product_name.to_string() {
                                if !name.is_empty() {
                                    metadata.display_name = Some(name);
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut hicon = HICON::default();
        let mut icon_obtained = false;

        // Try to get icon from shell API with retry
        for _ in 0..3 {
            if SHGetFileInfoW(
                PCWSTR(wide_path.as_ptr()),
                FILE_FLAGS_AND_ATTRIBUTES(0),
                Some(&mut file_info),
                std::mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_LARGEICON,
            ) != 0 {
                if !file_info.hIcon.is_invalid() {
                    hicon = HICON(file_info.hIcon.0);
                    icon_obtained = true;
                    break;
                }
            }
            std::thread::sleep(Duration::from_millis(10));
        }

        if icon_obtained && !hicon.is_invalid() {
            if let Some(icon_data) = extract_icon_to_base64(hicon) {
                // Update cache with both icon and display name
                if let Ok(mut cache) = ICON_CACHE.lock() {
                    cache.insert(exe_path.to_string(), (icon_data.clone(), metadata.display_name.clone(), Instant::now()));
                }
                metadata.icon_base64 = Some(icon_data);
            } else {
                log_error!("[Icon] Failed to convert icon to base64 for: {}", exe_path);
            }
            DestroyIcon(hicon);
        } else {
            log_error!("[Icon] All methods failed to get icon for: {}", exe_path);
            // Try to get from cache even if current attempt failed
            if let Ok(cache) = ICON_CACHE.lock() {
                if let Some((cached_icon, cached_name, _)) = cache.get(exe_path) {
                    metadata.icon_base64 = Some(cached_icon.clone());
                    if metadata.display_name.is_none() {
                        metadata.display_name = cached_name.clone();
                    }
                }
            }
        }
    }

    metadata
}

fn extract_icon_to_base64(hicon: HICON) -> Option<String> {
    unsafe {
        use windows::Win32::UI::WindowsAndMessaging::GetIconInfo;
        use windows::Win32::Graphics::Gdi::{
            GetDC, ReleaseDC, CreateCompatibleDC, DeleteDC,
            CreateCompatibleBitmap, SelectObject, DeleteObject,
            GetDIBits,
        };

        let mut icon_info = windows::Win32::UI::WindowsAndMessaging::ICONINFO::default();
        if !GetIconInfo(hicon, &mut icon_info).as_bool() {
            log_error!("[Icon] Failed to get icon info");
            return None;
        }

        let hdc = GetDC(None);
        if hdc.is_invalid() {
            log_error!("[Icon] Failed to get DC");
            return None;
        }

        let hdc_mem = CreateCompatibleDC(hdc);
        if hdc_mem.is_invalid() {
            log_error!("[Icon] Failed to create compatible DC");
            ReleaseDC(None, hdc);
            return None;
        }

        // Increased icon size for better quality on high DPI displays
        const ICON_SIZE: i32 = 48;
        let hbmp = CreateCompatibleBitmap(hdc, ICON_SIZE, ICON_SIZE);
        if hbmp.is_invalid() {
            log_error!("[Icon] Failed to create compatible bitmap");
            DeleteDC(hdc_mem);
            ReleaseDC(None, hdc);
            return None;
        }

        let old_bmp = SelectObject(hdc_mem, hbmp);

        use windows::Win32::UI::WindowsAndMessaging::DrawIconEx;
        use windows::Win32::UI::WindowsAndMessaging::DI_NORMAL;
        
        if !DrawIconEx(
            hdc_mem,
            0,
            0,
            hicon,
            ICON_SIZE,
            ICON_SIZE,
            0,
            None,
            DI_NORMAL,
        ).as_bool() {
            log_error!("[Icon] Failed to draw icon");
            SelectObject(hdc_mem, old_bmp);
            DeleteObject(hbmp);
            DeleteDC(hdc_mem);
            ReleaseDC(None, hdc);
            return None;
        }

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: ICON_SIZE,
                biHeight: -ICON_SIZE, // negative height for top-down bitmap
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0 as u32,
                biSizeImage: (ICON_SIZE * ICON_SIZE * 4) as u32,
                ..Default::default()
            },
            ..Default::default()
        };

        let mut buffer = vec![0u8; (ICON_SIZE * ICON_SIZE * 4) as usize];

        if GetDIBits(
            hdc_mem,
            hbmp,
            0,
            ICON_SIZE as u32,
            Some(buffer.as_mut_ptr() as *mut _),
            &mut bi,
            DIB_RGB_COLORS,
        ) == 0 {
            log_error!("[Icon] Failed to get DIB bits");
            SelectObject(hdc_mem, old_bmp);
            DeleteObject(hbmp);
            DeleteDC(hdc_mem);
            ReleaseDC(None, hdc);
            return None;
        }

        // Check if the icon has any non-transparent pixels
        let has_visible_pixels = buffer.chunks(4).any(|pixel| pixel[3] > 0);
        if !has_visible_pixels {
            log_error!("[Icon] Icon appears to be empty or fully transparent");
            SelectObject(hdc_mem, old_bmp);
            DeleteObject(hbmp);
            DeleteDC(hdc_mem);
            ReleaseDC(None, hdc);
            return None;
        }

        // convert bgra to rgba for image processing
        for pixel in buffer.chunks_mut(4) {
            pixel.swap(0, 2);
        }

        // convert to rgba image
        let img: ImageBuffer<Rgba<u8>, Vec<u8>> = match ImageBuffer::from_raw(
            ICON_SIZE as u32,
            ICON_SIZE as u32,
            buffer,
        ) {
            Some(img) => img,
            None => {
                log_error!("[Icon] Failed to create image buffer");
                return None;
            }
        };

        // convert to png and then base64
        let mut png_data = Vec::new();
        if let Err(e) = img.write_to(&mut std::io::Cursor::new(&mut png_data), image::ImageFormat::Png) {
            log_error!("[Icon] Failed to encode PNG: {}", e);
            return None;
        }

        let base64_string = BASE64.encode(&png_data);
        let result = format!("data:image/png;base64,{}", base64_string);

        SelectObject(hdc_mem, old_bmp);
        DeleteObject(hbmp);
        DeleteDC(hdc_mem);
        ReleaseDC(None, hdc);

        Some(result)
    }
} 