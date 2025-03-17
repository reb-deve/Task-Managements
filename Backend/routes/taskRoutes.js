const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new task
router.post('/', taskController.createTask);

// Get all tasks for a project
router.get('/project/:projectId', taskController.getProjectTasks);

// Get single task
router.get('/:taskId', taskController.getTask);

// Update task
router.put('/:taskId', taskController.updateTask);

// Delete task
router.delete('/:taskId', taskController.deleteTask);

// Add attachment to task
router.post('/:taskId/attachments', taskController.addAttachment);

module.exports = router; 