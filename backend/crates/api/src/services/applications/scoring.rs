//! Applicant scoring.
//!
//! Computes a `0..=100` score from an application's affordability, employment,
//! references, and background-check results, weighted income 30 / credit 25 /
//! employment 20 / references 15 / background 10. Pure and deterministic - no
//! IO; the db layer gathers the [`ScoreInputs`] and the handler serves the
//! resulting [`ApplicationScore`].

use crate::services::applications::{
    db::ScoreInputs,
    models::{ApplicationScore, ScoreFactor, ScoreFactorKind},
};

/// Computes the weighted score for `inputs`.
#[inline]
#[must_use]
pub fn compute(inputs: &ScoreInputs) -> ApplicationScore {
    let breakdown = vec![
        ScoreFactor {
            factor: ScoreFactorKind::Income,
            weight: 30,
            score: score_income(inputs.monthly_income, inputs.rent_monthly),
        },
        ScoreFactor {
            factor: ScoreFactorKind::Credit,
            weight: 25,
            score: score_credit(inputs.credit_cleared),
        },
        ScoreFactor {
            factor: ScoreFactorKind::Employment,
            weight: 20,
            score: score_employment(&inputs.employment_length),
        },
        ScoreFactor {
            factor: ScoreFactorKind::References,
            weight: 15,
            score: score_references(inputs.has_second_reference),
        },
        ScoreFactor {
            factor: ScoreFactorKind::Background,
            weight: 10,
            score: score_background(inputs.criminal_cleared, inputs.eviction_cleared),
        },
    ];
    let total = breakdown.iter().map(|factor| factor.score).sum();
    ApplicationScore { total, breakdown }
}

/// Income factor (max 30): banded affordability against the standard 3x-rent
/// target, zero when rent is unknown (a withdrawn listing).
fn score_income(monthly_income: f64, rent_monthly: Option<f64>) -> i32 {
    let Some(rent) = rent_monthly.filter(|rent| *rent > 0.0) else {
        return 0;
    };
    let ratio = monthly_income / rent;
    if ratio >= 3.0 {
        30
    } else if ratio >= 2.5 {
        25
    } else if ratio >= 2.0 {
        20
    } else if ratio >= 1.5 {
        13
    } else if ratio >= 1.0 {
        7
    } else {
        0
    }
}

/// Credit factor (max 25): a cleared check full, adverse partial, absent zero.
fn score_credit(credit_cleared: Option<bool>) -> i32 {
    match credit_cleared {
        Some(true) => 25,
        Some(false) => 8,
        None => 0,
    }
}

/// Employment factor (max 20): by tenure - 2+ years full, 1+ partial, else low.
fn score_employment(employment_length: &str) -> i32 {
    let years = parse_years(employment_length);
    if years >= 2.0 {
        20
    } else if years >= 1.0 {
        13
    } else {
        7
    }
}

/// References factor (max 15): both references full, a single one partial.
fn score_references(has_second_reference: bool) -> i32 {
    if has_second_reference { 15 } else { 8 }
}

/// Background factor (max 10): 5 points per cleared criminal/eviction check.
fn score_background(criminal_cleared: Option<bool>, eviction_cleared: Option<bool>) -> i32 {
    let cleared = [criminal_cleared, eviction_cleared]
        .into_iter()
        .filter(|check| *check == Some(true))
        .count();
    i32::try_from(cleared).unwrap_or(0) * 5
}

/// Approximate tenure in years from free text like "3 years" or "18 months"
/// (a bare number is read as years; "month" switches to months).
fn parse_years(employment_length: &str) -> f64 {
    let lowered = employment_length.to_lowercase();
    let number = lowered
        .split_whitespace()
        .find_map(|token| token.parse::<f64>().ok())
        .unwrap_or(0.0);
    if lowered.contains("month") {
        number / 12.0
    } else {
        number
    }
}
