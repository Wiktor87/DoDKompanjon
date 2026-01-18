// Input validation utilities

// Input validation constants
var INPUT_LIMITS = {
    name: 100,
    description: 1000,  // Descriptions can be longer
    notes: 5000,        // Notes can be longer
    shortText: 100      // Default for short fields
};

/**
 * Validate and truncate input to specified maximum length
 * @param {string} text - The input text to validate
 * @param {number} maxLength - Maximum allowed length (optional, defaults to shortText limit)
 * @returns {string} Validated and truncated text
 */
function validateInput(text, maxLength) {
    if (!text) return '';
    var limit = maxLength || INPUT_LIMITS.shortText;
    var str = String(text);
    if (str.length > limit) {
        console.warn('Input truncated from ' + str.length + ' to ' + limit + ' characters');
        return str.substring(0, limit);
    }
    return str;
}

/**
 * Validate an object's fields against specified limits
 * @param {object} data - Object containing fields to validate
 * @param {object} fieldLimits - Map of field names to their max lengths
 * @returns {object} New object with validated fields
 */
function validateFields(data, fieldLimits) {
    var validated = {};
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            if (fieldLimits[key] !== undefined) {
                if (typeof data[key] === 'string') {
                    validated[key] = validateInput(data[key], fieldLimits[key]);
                } else {
                    validated[key] = data[key];
                }
            } else {
                validated[key] = data[key];
            }
        }
    }
    return validated;
}

console.log('✅ Input validation utilities loaded');
