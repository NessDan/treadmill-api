// We're using the Leger formula:
// https://web.stanford.edu/~clint/Run_Walk2004a.rtf
/*
    ...we compared our actual measures against formulas or tables frequently cited in the literature or used
    in clinical practice (the ACSM prediction formula (1), McArdle tables (22), van der Walt prediction formula
    (33), Epstein (12) and Léger (20) prediction models for running, and Pandolf prediction formula for
    walking (27)). We observed that the ACSM formula overestimated the average energy expenditure in steady-state
    running of 1600 m by only 4.3% (21kJ), and underestimated energy expenditure by only 3.8% (13 kJ) for 1600 m.
    The total error of this overestimation was -20.0 kJ for running energy expenditures, and there was a 14.4-kJ
    underestimation of walking energy expenditures. Similarly, the equation by Léger overestimated by 2%
    (-10.1 kJ), and Pandolf overestimated by 2.8% (-10.0 kJ); these differences were minimal.
*/
// https://fitness.stackexchange.com/a/25564/29759
// Kcal/Min ~= respiratoryExchangeRatio * massKg * VO2 / 1000
// VO2 = (0.2 * metersMin) + (0.9 * metersMin * fractionalgrade) + 3.5
