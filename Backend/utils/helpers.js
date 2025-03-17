const jwt = require('jsonwebtoken');

const helpers = {
    // Generate JWT token
    generateToken: (user) => {
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    },

    // Validate MongoDB ObjectId
    isValidObjectId: (id) => {
        const ObjectId = require('mongoose').Types.ObjectId;
        return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
    },

    // Format error response
    formatError: (error) => {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return {
                message: 'Validation Error',
                errors
            };
        }
        
        if (error.code === 11000) { // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return {
                message: 'Duplicate Error',
                error: `${field} already exists`
            };
        }

        return {
            message: 'Server Error',
            error: error.message
        };
    },

    // Pagination helper
    paginateResults: async (model, query = {}, page = 1, limit = 10, populate = []) => {
        const skip = (page - 1) * limit;
        
        const [data, total] = await Promise.all([
            model.find(query)
                .populate(populate)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            model.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    },

    // Filter sanitization
    sanitizeFilters: (filters) => {
        const sanitized = {};
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                sanitized[key] = filters[key];
            }
        });
        return sanitized;
    },

    // Date range helper
    getDateRange: (range) => {
        const now = new Date();
        const ranges = {
            today: {
                start: new Date(now.setHours(0, 0, 0, 0)),
                end: new Date(now.setHours(23, 59, 59, 999))
            },
            week: {
                start: new Date(now.setDate(now.getDate() - now.getDay())),
                end: new Date(now.setDate(now.getDate() - now.getDay() + 6))
            },
            month: {
                start: new Date(now.getFullYear(), now.getMonth(), 1),
                end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
            }
        };
        return ranges[range] || null;
    },

    // Response wrapper
    sendResponse: (res, statusCode, data, message = '') => {
        return res.status(statusCode).json({
            success: statusCode < 400,
            message,
            data
        });
    },

    // Check user permissions
    checkPermissions: (user, requiredRole) => {
        const roles = ['user', 'manager', 'admin'];
        const userRoleIndex = roles.indexOf(user.role);
        const requiredRoleIndex = roles.indexOf(requiredRole);
        
        return userRoleIndex >= requiredRoleIndex;
    },

    // File size validator
    validateFileSize: (fileSize, maxSize = 5 * 1024 * 1024) => { // Default 5MB
        return fileSize <= maxSize;
    },

    // Allowed file types
    validateFileType: (mimeType) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        return allowedTypes.includes(mimeType);
    }
};

module.exports = helpers; 