const Decimal = require('decimal.js');

module.exports = {
    maxSpeed: new Decimal(4),
    startSpeed: new Decimal(2),
    speedWireFrequency: 20, // Treadmill uses 20Hz freq from testing.
    inclineTachTimeoutMs: 2000, // After 2s, we know incline is no longer running.
    maximumGrade: new Decimal(19), // Console board shows -3% -> 15% so 19 steps total.
    safeInclineGradeValueEveryMs: new Decimal(0.000268475343), // 19 / 70.77s = 0.268475343 grades / s
    safeDeclineGradeValueEveryMs: new Decimal(0.000271273558), // 19 / 70.04s = 0.271273558 grades / s
};