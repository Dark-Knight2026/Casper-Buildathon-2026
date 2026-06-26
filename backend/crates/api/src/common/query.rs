//! Composable query building for runtime `QueryBuilder` searches.
//!
//! A list endpoint whose filter set is dynamic builds its SQL with a runtime
//! `QueryBuilder` rather than a compile-time macro. [`AppendFilters`] and
//! [`AppendOrder`] let a validated filter struct own its ` AND ...` and
//! `ORDER BY` fragments, and [`QueryBuilderExt`] adds the chaining shims
//! (`.append()`, `.order_by()`, `.limit_offset()`) so a whole search reads as
//! one fluent build off the same filter value.

use sqlx::{Postgres, QueryBuilder};

/// A validated filter that can append its `WHERE` conditions to a query.
///
/// The base query supplies the leading `WHERE <constant predicate>`; each impl
/// pushes only ` AND ...` fragments, so one impl serves both the `COUNT(*)` and
/// the page query off the same filter value.
pub trait AppendFilters {
    /// Appends this filter's ` AND ...` conditions to an in-progress query.
    fn append_to(&self, builder: &mut QueryBuilder<Postgres>);
}

/// A validated filter that can append its `ORDER BY` clause to a query.
///
/// Kept separate from [`AppendFilters`] because the count query orders nothing -
/// only the page query calls it. An impl may bind values inline (a geo-distance
/// sort binds its radius center), which is why it owns the whole clause rather
/// than yielding a plain column name.
pub trait AppendOrder {
    /// Appends this filter's ` ORDER BY ...` clause to an in-progress query.
    fn append_order(&self, builder: &mut QueryBuilder<Postgres>);
}

/// Chaining shims over [`QueryBuilder`] so a filter builds itself fluently.
///
/// Each method returns `&mut Self`, so `WHERE`, `ORDER BY` and `LIMIT/OFFSET`
/// compose into one chain off a base `QueryBuilder::new(...)`.
pub trait QueryBuilderExt {
    /// Appends `filters`' ` AND ...` conditions and returns `self` for chaining.
    fn append<F>(&mut self, filters: &F) -> &mut Self
    where
        F: AppendFilters;

    /// Appends `order`'s ` ORDER BY ...` clause and returns `self` for chaining.
    fn order_by<O>(&mut self, order: &O) -> &mut Self
    where
        O: AppendOrder;

    /// Appends bound ` LIMIT <limit> OFFSET <offset>` and returns `self`.
    fn limit_offset(&mut self, limit: i64, offset: i64) -> &mut Self;
}

impl QueryBuilderExt for QueryBuilder<Postgres> {
    #[inline]
    fn append<F: AppendFilters>(&mut self, filters: &F) -> &mut Self {
        filters.append_to(self);
        self
    }

    #[inline]
    fn order_by<O: AppendOrder>(&mut self, order: &O) -> &mut Self {
        order.append_order(self);
        self
    }

    #[inline]
    fn limit_offset(&mut self, limit: i64, offset: i64) -> &mut Self {
        self.push(" LIMIT ");
        self.push_bind(limit);
        self.push(" OFFSET ");
        self.push_bind(offset);
        self
    }
}
