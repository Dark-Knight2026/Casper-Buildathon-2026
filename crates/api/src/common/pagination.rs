//! Reusable pagination primitives: [`Pageable`] trait, [`Pagination`] query
//! parameters, and [`PaginatedResponse`] generic response wrapper.

use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

/// A trait for types that provide pagination information.
///
/// Implement this on any query-param struct that embeds [`Pagination`] via
/// `#[serde(flatten)]` so that handlers can accept a single generic bound.
pub trait Pageable {
    /// Effective 1-based page number.
    fn page(&self) -> i64;
    /// Effective page size (clamped to `1..=100`).
    fn page_size(&self) -> i64;
    /// SQL `OFFSET` derived from page and page size.
    fn offset(&self) -> i64;
}

/// Core pagination query parameters extracted from the URL query string.
///
/// Both fields are optional and fall back to sensible defaults.
#[derive(Debug, Default, Deserialize, IntoParams, ToSchema, Clone)]
pub struct Pagination {
    /// Page number (1-based, defaults to 1).
    #[schema(default = 1, minimum = 1)]
    #[serde(default)]
    pub page: Option<i64>,
    /// Items per page (1-100, defaults to 25).
    #[schema(default = 25, minimum = 1, maximum = 100)]
    #[serde(default)]
    pub page_size: Option<i64>,
}

impl Pagination {
    /// Default page number when none is provided.
    pub const DEFAULT_PAGE: i64 = 1;
    /// Minimum allowed page number.
    pub const MIN_PAGE: i64 = 1;
    /// Default items per page when none is provided.
    pub const DEFAULT_PAGE_SIZE: i64 = 25;
    /// Minimum allowed page size.
    pub const MIN_PAGE_SIZE: i64 = 1;
    /// Maximum allowed page size.
    pub const MAX_PAGE_SIZE: i64 = 100;

    /// Returns the effective page number, falling back to the default.
    #[must_use]
    #[inline]
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(Self::DEFAULT_PAGE).max(Self::MIN_PAGE)
    }

    /// Returns the effective page size, clamped to `[1, 100]`.
    #[must_use]
    #[inline]
    pub fn page_size(&self) -> i64 {
        self.page_size
            .unwrap_or(Self::DEFAULT_PAGE_SIZE)
            .clamp(Self::MIN_PAGE_SIZE, Self::MAX_PAGE_SIZE)
    }

    /// Calculates the SQL `OFFSET` for database queries.
    #[must_use]
    #[inline]
    pub fn offset(&self) -> i64 {
        self.page()
            .saturating_sub(1)
            .saturating_mul(self.page_size())
    }
}

impl Pageable for Pagination {
    #[inline]
    fn page(&self) -> i64 {
        self.page()
    }
    #[inline]
    fn page_size(&self) -> i64 {
        self.page_size()
    }
    #[inline]
    fn offset(&self) -> i64 {
        self.offset()
    }
}

/// A generic container for paginated API responses.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResponse<T> {
    /// Total number of items across all pages.
    pub item_count: i64,
    /// Total number of pages.
    pub page_count: i64,
    /// Items for the current page.
    pub data: Vec<T>,
}

impl<T> PaginatedResponse<T> {
    /// Creates a new paginated response, computing `page_count` from the total
    /// item count and the effective page size.
    #[must_use]
    #[inline]
    pub fn new<P: Pageable>(data: Vec<T>, item_count: i64, pagination: &P) -> Self {
        let page_size = pagination.page_size();
        let page_count = if page_size <= 0 {
            0
        } else {
            (item_count + page_size - 1) / page_size
        };
        Self {
            item_count,
            page_count,
            data,
        }
    }
}
