const Team = require('../models/Team');
const User = require('../models/User');

const teamController = {
    // Create new team
    createTeam: async (req, res) => {
        try {
            const { name, description, visibility } = req.body;

            const team = await Team.create({
                name,
                description,
                createdBy: req.user.id,
                members: [{
                    user: req.user.id,
                    role: 'admin',
                    joinedAt: new Date()
                }],
                settings: {
                    visibility: visibility || 'private'
                }
            });

            await team.populate([
                { path: 'createdBy', select: 'username firstName lastName' },
                { path: 'members.user', select: 'username firstName lastName avatar' }
            ]);

            // Update user's teams array
            await User.findByIdAndUpdate(req.user.id, {
                $push: { teams: team._id }
            });

            res.status(201).json(team);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all teams for a user
    getUserTeams: async (req, res) => {
        try {
            const teams = await Team.find({
                'members.user': req.user.id
            })
                .populate('createdBy', 'username firstName lastName')
                .populate('members.user', 'username firstName lastName avatar')
                .populate('projects', 'name description status')
                .sort({ createdAt: -1 });

            res.json(teams);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get single team
    getTeam: async (req, res) => {
        try {
            const team = await Team.findById(req.params.teamId)
                .populate('createdBy', 'username firstName lastName')
                .populate('members.user', 'username firstName lastName avatar')
                .populate({
                    path: 'projects',
                    select: 'name description status progress',
                    populate: {
                        path: 'members.user',
                        select: 'username firstName lastName avatar'
                    }
                });

            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }

            // Check if user has access to the team
            const isMember = team.members.some(
                member => member.user._id.toString() === req.user.id
            );

            if (!isMember && team.settings.visibility === 'private') {
                return res.status(403).json({ message: 'Not authorized to view this team' });
            }

            res.json(team);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Update team
    updateTeam: async (req, res) => {
        try {
            const { name, description, settings } = req.body;
            const team = await Team.findById(req.params.teamId);

            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }

            // Check if user has admin rights
            const isAdmin = team.members.some(
                member => member.user.toString() === req.user.id &&
                ['admin'].includes(member.role)
            );

            if (!isAdmin && team.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this team' });
            }

            team.name = name || team.name;
            team.description = description || team.description;
            if (settings) {
                team.settings = { ...team.settings, ...settings };
            }

            const updatedTeam = await team.save();
            await updatedTeam.populate([
                { path: 'createdBy', select: 'username firstName lastName' },
                { path: 'members.user', select: 'username firstName lastName avatar' }
            ]);

            res.json(updatedTeam);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Add/Update team member
    updateTeamMember: async (req, res) => {
        try {
            const { userId, role } = req.body;
            const team = await Team.findById(req.params.teamId);

            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }

            // Check if user has admin rights
            const isAdmin = team.members.some(
                member => member.user.toString() === req.user.id &&
                ['admin'].includes(member.role)
            );

            if (!isAdmin && team.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to manage team members' });
            }

            // Update or add member
            const memberIndex = team.members.findIndex(
                member => member.user.toString() === userId
            );

            if (memberIndex > -1) {
                team.members[memberIndex].role = role;
            } else {
                team.members.push({
                    user: userId,
                    role,
                    joinedAt: new Date()
                });

                // Update user's teams array
                await User.findByIdAndUpdate(userId, {
                    $push: { teams: team._id }
                });
            }

            const updatedTeam = await team.save();
            await updatedTeam.populate({
                path: 'members.user',
                select: 'username firstName lastName avatar'
            });

            res.json(updatedTeam);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Remove team member
    removeTeamMember: async (req, res) => {
        try {
            const { userId } = req.params;
            const team = await Team.findById(req.params.teamId);

            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }

            // Check if user has admin rights
            const isAdmin = team.members.some(
                member => member.user.toString() === req.user.id &&
                ['admin'].includes(member.role)
            );

            if (!isAdmin && team.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to manage team members' });
            }

            // Remove member
            team.members = team.members.filter(
                member => member.user.toString() !== userId
            );

            // Remove team from user's teams array
            await User.findByIdAndUpdate(userId, {
                $pull: { teams: team._id }
            });

            await team.save();
            res.json({ message: 'Member removed successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Delete team
    deleteTeam: async (req, res) => {
        try {
            const team = await Team.findById(req.params.teamId);

            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }

            if (team.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this team' });
            }

            // Remove team from all members' teams array
            await User.updateMany(
                { _id: { $in: team.members.map(member => member.user) } },
                { $pull: { teams: team._id } }
            );

            await team.remove();
            res.json({ message: 'Team deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = teamController; 