use crate::log_info;

pub trait Cache {
    fn cache_name(&self) -> &str;

    fn clear(&self);

    fn log_clear(&self) {
        log_info!("{} cache cleared", self.cache_name());
    }
}