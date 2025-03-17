const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new comment
router.post('/', commentController.createComment);

// Get all comments for a task
router.get('/task/:taskId', commentController.getTaskComments);

// Update comment
router.put('/:commentId', commentController.updateComment);

// Delete comment
router.delete('/:commentId', commentController.deleteComment);

// Add attachment to comment
router.post('/:commentId/attachments', commentController.addAttachment);

module.exports = router; 