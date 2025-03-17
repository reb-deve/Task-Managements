const Task = require('../models/Task');
const Project = require('../models/Project');

const taskController = {
    // Create new task
    createTask: async (req, res) => {
        try {
            const { title, description, project, dueDate, priority, assignedTo, tags } = req.body;

            // Verify project exists and user has access
            const projectDoc = await Project.findById(project);
            if (!projectDoc) {
                return res.status(404).json({ message: 'Project not found' });
            }

            // Check if user has access to the project
            const hasAccess = projectDoc.members.some(
                member => member.user.toString() === req.user.id &&
                ['contributor', 'manager'].includes(member.role)
            );
            
            if (!hasAccess && projectDoc.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to create tasks in this project' });
            }

            const task = await Task.create({
                title,
                description,
                project,
                dueDate,
                priority,
                assignedTo,
                tags,
                createdBy: req.user.id
            });

            await task.populate([
                { path: 'assignedTo', select: 'username firstName lastName avatar' },
                { path: 'createdBy', select: 'username firstName lastName' }
            ]);

            res.status(201).json(task);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all tasks for a project
    getProjectTasks: async (req, res) => {
        try {
            const { projectId } = req.params;
            const { status, priority, assignedTo } = req.query;

            const filter = { project: projectId };
            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (assignedTo) filter.assignedTo = assignedTo;

            const tasks = await Task.find(filter)
                .populate('assignedTo', 'username firstName lastName avatar')
                .populate('createdBy', 'username firstName lastName')
                .populate('comments')
                .sort({ createdAt: -1 });

            res.json(tasks);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get single task
    getTask: async (req, res) => {
        try {
            const task = await Task.findById(req.params.taskId)
                .populate('assignedTo', 'username firstName lastName avatar')
                .populate('createdBy', 'username firstName lastName')
                .populate({
                    path: 'comments',
                    populate: {
                        path: 'author',
                        select: 'username firstName lastName avatar'
                    }
                });

            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            res.json(task);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Update task
    updateTask: async (req, res) => {
        try {
            const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;
            const task = await Task.findById(req.params.taskId);

            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            // Check if user has permission to update
            const project = await Project.findById(task.project);
            const hasAccess = project.members.some(
                member => member.user.toString() === req.user.id &&
                ['contributor', 'manager'].includes(member.role)
            );

            if (!hasAccess && project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this task' });
            }

            // Update task fields
            task.title = title || task.title;
            task.description = description || task.description;
            task.status = status || task.status;
            task.priority = priority || task.priority;
            task.dueDate = dueDate || task.dueDate;
            task.assignedTo = assignedTo || task.assignedTo;
            task.tags = tags || task.tags;

            // Set completedAt date if status is completed
            if (status === 'completed' && task.status !== 'completed') {
                task.completedAt = new Date();
            } else if (status !== 'completed') {
                task.completedAt = null;
            }

            const updatedTask = await task.save();
            await updatedTask.populate([
                { path: 'assignedTo', select: 'username firstName lastName avatar' },
                { path: 'createdBy', select: 'username firstName lastName' }
            ]);

            res.json(updatedTask);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Delete task
    deleteTask: async (req, res) => {
        try {
            const task = await Task.findById(req.params.taskId);

            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            // Check if user has permission to delete
            const project = await Project.findById(task.project);
            const hasAccess = project.members.some(
                member => member.user.toString() === req.user.id &&
                member.role === 'manager'
            );

            if (!hasAccess && project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this task' });
            }

            await task.remove();
            res.json({ message: 'Task deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Add attachment to task
    addAttachment: async (req, res) => {
        try {
            const { name, url } = req.body;
            const task = await Task.findById(req.params.taskId);

            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            task.attachments.push({ name, url });
            const updatedTask = await task.save();

            res.json(updatedTask);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = taskController; 