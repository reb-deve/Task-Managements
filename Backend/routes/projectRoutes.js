const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new project
router.post('/', projectController.createProject);

// Get all projects for a team
router.get('/team/:teamId', projectController.getTeamProjects);

// Get single project
router.get('/:projectId', projectController.getProject);

// Update project
router.put('/:projectId', projectController.updateProject);

// Delete project
router.delete('/:projectId', projectController.deleteProject);

// Project member management
router.post('/:projectId/members', projectController.updateProjectMember);
router.delete('/:projectId/members/:userId', projectController.removeProjectMember);

module.exports = router; 