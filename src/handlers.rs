use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use crate::models::{
    PropertyPerformanceReport, PropertyPerformanceRequest, TaxCalculationRequest, TaxCategory,
    TaxReport,
};
use crate::db::DbPool;
use crate::auth::AuthUser;

// Health Check
pub async fn health_check() -> StatusCode {
    StatusCode::OK
}

// Tax Calculation Handler
pub async fn calculate_tax_liability(
    State(_pool): State<DbPool>,
    _user: AuthUser, // Ensure user is authenticated
    Json(payload): Json<TaxCalculationRequest>,
) -> Result<Json<TaxReport>, StatusCode> {
    // In a real implementation, we would fetch income/expenses from the DB for the given properties and fiscal year.
    // For now, we will simulate the calculation.
    
    // Mock data simulation
    let mut total_income = Decimal::from_i64(150000).unwrap();
    let mut total_deductions = Decimal::from_i64(45000).unwrap();
    
    if payload.include_depreciation {
        total_deductions += Decimal::from_i64(12000).unwrap();
    }

    let taxable_income = total_income - total_deductions;
    let tax_rate = Decimal::from_f64(0.24).unwrap(); // Simplified 24% tax rate
    let estimated_tax = taxable_income * tax_rate;

    let report = TaxReport {
        total_taxable_income: taxable_income,
        total_deductions,
        estimated_tax,
        breakdown: vec![
            TaxCategory {
                category: "Property Tax".to_string(),
                amount: Decimal::from_i64(15000).unwrap(),
            },
            TaxCategory {
                category: "Maintenance".to_string(),
                amount: Decimal::from_i64(20000).unwrap(),
            },
            TaxCategory {
                category: "Management Fees".to_string(),
                amount: Decimal::from_i64(10000).unwrap(),
            },
        ],
    };

    Ok(Json(report))
}

// Analytics Handler
pub async fn get_property_performance(
    State(_pool): State<DbPool>,
    _user: AuthUser,
    Json(_payload): Json<PropertyPerformanceRequest>,
) -> Result<Json<PropertyPerformanceReport>, StatusCode> {
    // Mock calculation for analytics
    // Real implementation would execute complex aggregation queries via SQLx
    
    let total_revenue = Decimal::from_i64(240000).unwrap();
    let total_expenses = Decimal::from_i64(80000).unwrap();
    let net_operating_income = total_revenue - total_expenses;
    
    // ROI = (Net Profit / Total Investment) * 100
    // Assuming total investment is 1,000,000 for this example
    let roi_percentage = Decimal::from_f64(16.0).unwrap(); 
    let occupancy_rate = Decimal::from_f64(95.5).unwrap();

    let report = PropertyPerformanceReport {
        total_revenue,
        total_expenses,
        net_operating_income,
        roi_percentage,
        occupancy_rate,
    };

    Ok(Json(report))
}