// Custom logging module with visual symbols for different log levels

use log::{Level, LevelFilter, Metadata, Record};

static LOGGER_INIT: std::sync::Once = std::sync::Once::new();

struct SymbolLogger;

impl log::Log for SymbolLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= Level::Info
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let symbol = match record.level() {
                Level::Error => "[-]",
                Level::Warn => "[!]",
                Level::Info => "[*]",
                _ => "[*]",
            };
            println!("{} {}", symbol, record.args());
        }
    }

    fn flush(&self) {}
}

static LOGGER: SymbolLogger = SymbolLogger;

pub fn init() {
    LOGGER_INIT.call_once(|| {
        log::set_logger(&LOGGER)
            .map(|()| log::set_max_level(LevelFilter::Info))
            .expect("[!] Failed to initialize logger");
    });
}

#[ctor::ctor]
fn init_logger() {
    init();
}