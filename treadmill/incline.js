const treadmill = {
    targetGrade: new Decimal(0), // This should be loaded from a file on load
    currentGrade: new Decimal(0), // This should be loaded from a file on load
    isInclining: false,
    isDeclining: false,
    isCalibrating: false,
};

module.exports = treadmill;
