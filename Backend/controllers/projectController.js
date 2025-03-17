const Project = require('../models/Project');
const Team = require('../models/Team');

const projectController = {
    // Create new project
    createProject: async (req, res) => {
        try {
            const { name, description, team, startDate, endDate, tags } = req.body;

            // Verify team exists and user has access
            const teamDoc = await Team.findById(team);
            if (!teamDoc) {
                return res.status(404).json({ message: 'Team not found' });
            }

            // Check if user is team member with appropriate role
            const isMember = teamDoc.members.some(
                member => member.user.toString() === req.user.id &&
                ['lead', 'admin'].includes(member.role)
            );

            if (!isMember && teamDoc.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to create projects in this team' });
            }

            const project = await Project.create({
                name,
                description,
                team,
                startDate,
                endDate,
                tags,
                owner: req.user.id,
                members: [{ user: req.user.id, role: 'manager' }]
            });

            await project.populate([
                { path: 'owner', select: 'username firstName lastName' },
                { path: 'team', select: 'name description' },
                { 
                    path: 'members.user',
                    select: 'username firstName lastName avatar'
                }
            ]);

            res.status(201).json(project);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all projects for a team
    getTeamProjects: async (req, res) => {
        try {
            const { teamId } = req.params;
            const { status } = req.query;

            const filter = { team: teamId };
            if (status) filter.status = status;

            const projects = await Project.find(filter)
                .populate('owner', 'username firstName lastName')
                .populate('team', 'name description')
                .populate('members.user', 'username firstName lastName avatar')
                .sort({ createdAt: -1 });

            res.json(projects);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get single project
    getProject: async (req, res) => {
        try {
            const project = await Project.findById(req.params.projectId)
                .populate('owner', 'username firstName lastName')
                .populate('team', 'name description')
                .populate('members.user', 'username firstName lastName avatar')
                .populate({
                    path: 'tasks',
                    populate: [
                        { path: 'assignedTo', select: 'username firstName lastName avatar' },
                        { path: 'createdBy', select: 'username firstName lastName' }
                    ]
                });

            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            res.json(project);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Update project
    updateProject: async (req, res) => {
        try {
            const { name, description, status, startDate, endDate, tags } = req.body;
            const project = await Project.findById(req.params.projectId);

            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            // Check if user has permission to update
            const hasAccess = project.members.some(
                member => member.user.toString() === req.user.id &&
                member.role === 'manager'
            );

            if (!hasAccess && project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this project' });
            }

            project.name = name || project.name;
            project.description = description || project.description;
            project.status = status || project.status;
            project.startDate = startDate || project.startDate;
            project.endDate = endDate || project.endDate;
            project.tags = tags || project.tags;

            const updatedProject = await project.save();
            await updatedProject.populate([
                { path: 'owner', select: 'username firstName lastName' },
                { path: 'team', select: 'name description' },
                { path: 'members.user', select: 'username firstName lastName avatar' }
            ]);

            res.json(updatedProject);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Add/Update project member
    updateProjectMember: async (req, res) => {
        try {
            const { userId, role } = req.body;
            const project = await Project.findById(req.params.projectId);

            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            // Check if user has permission to manage members
            const hasAccess = project.members.some(
                member => member.user.toString() === req.user.id &&
                member.role === 'manager'
            );

            if (!hasAccess && project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to manage project members' });
            }

            // Update or add member
            const memberIndex = project.members.findIndex(
                member => member.user.toString() === userId
            );

            if (memberIndex > -1) {
                project.members[memberIndex].role = role;
            } else {
                project.members.push({ user: userId, role });
            }

            const updatedProject = await project.save();
            await updatedProject.populate({
                path: 'members.user',
                select: 'username firstName lastName avatar'
            });

            res.json(updatedProject);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Remove project member
    removeProjectMember: async (req, res) => {
        try {
            const { userId } = req.params;
            const project = await Project.findById(req.params.projectId);

            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            // Check if user has permission to manage members
            const hasAccess = project.members.some(
                member => member.user.toString() === req.user.id &&
                member.role === 'manager'
            );

            if (!hasAccess && project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to manage project members' });
            }

            // Remove member
            project.members = project.members.filter(
                member => member.user.toString() !== userId
            );

            await project.save();
            res.json({ message: 'Member removed successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Delete project
    deleteProject: async (req, res) => {
        try {
            const project = await Project.findById(req.params.projectId);

            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            if (project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this project' });
            }

            await project.remove();
            res.json({ message: 'Project deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = projectController; 