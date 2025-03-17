const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Create new team
router.post('/', teamController.createTeam);

// Get user's teams
router.get('/my-teams', teamController.getUserTeams);

// Get single team
router.get('/:teamId', teamController.getTeam);

// Update team
router.put('/:teamId', teamController.updateTeam);

// Delete team
router.delete('/:teamId', teamController.deleteTeam);

// Team member management
router.post('/:teamId/members', teamController.updateTeamMember);
router.delete('/:teamId/members/:userId', teamController.removeTeamMember);

module.exports = router; 