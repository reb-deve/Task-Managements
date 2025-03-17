const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');

const commentController = {
    // Create new comment
    createComment: async (req, res) => {
        try {
            const { content, taskId, mentions, parentComment } = req.body;

            // Verify task exists and user has access
            const task = await Task.findById(taskId).populate('project');
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            // Check if user has access to the project
            const project = task.project;
            const hasAccess = project.members.some(
                member => member.user.toString() === req.user.id
            );

            if (!hasAccess && project.owner.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to comment on this task' });
            }

            const comment = await Comment.create({
                content,
                task: taskId,
                author: req.user.id,
                mentions,
                parentComment
            });

            // Update task's comments array
            await Task.findByIdAndUpdate(taskId, {
                $push: { comments: comment._id }
            });

            // If this is a reply, update parent comment's replies array
            if (parentComment) {
                await Comment.findByIdAndUpdate(parentComment, {
                    $push: { replies: comment._id }
                });
            }

            await comment.populate([
                { path: 'author', select: 'username firstName lastName avatar' },
                { path: 'mentions', select: 'username firstName lastName avatar' }
            ]);

            res.status(201).json(comment);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all comments for a task
    getTaskComments: async (req, res) => {
        try {
            const { taskId } = req.params;

            const comments = await Comment.find({
                task: taskId,
                parentComment: null // Get only top-level comments
            })
                .populate('author', 'username firstName lastName avatar')
                .populate('mentions', 'username firstName lastName avatar')
                .populate({
                    path: 'replies',
                    populate: [
                        { path: 'author', select: 'username firstName lastName avatar' },
                        { path: 'mentions', select: 'username firstName lastName avatar' }
                    ]
                })
                .sort({ createdAt: -1 });

            res.json(comments);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Update comment
    updateComment: async (req, res) => {
        try {
            const { content, mentions } = req.body;
            const comment = await Comment.findById(req.params.commentId);

            if (!comment) {
                return res.status(404).json({ message: 'Comment not found' });
            }

            // Check if user is the author
            if (comment.author.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this comment' });
            }

            comment.content = content || comment.content;
            comment.mentions = mentions || comment.mentions;
            comment.isEdited = true;
            comment.editedAt = new Date();

            const updatedComment = await comment.save();
            await updatedComment.populate([
                { path: 'author', select: 'username firstName lastName avatar' },
                { path: 'mentions', select: 'username firstName lastName avatar' }
            ]);

            res.json(updatedComment);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Delete comment
    deleteComment: async (req, res) => {
        try {
            const comment = await Comment.findById(req.params.commentId);

            if (!comment) {
                return res.status(404).json({ message: 'Comment not found' });
            }

            // Check if user is the author or has project management rights
            const task = await Task.findById(comment.task).populate('project');
            const project = task.project;
            
            const isProjectManager = project.members.some(
                member => member.user.toString() === req.user.id &&
                member.role === 'manager'
            );

            if (comment.author.toString() !== req.user.id && !isProjectManager) {
                return res.status(403).json({ message: 'Not authorized to delete this comment' });
            }

            // Remove comment from task's comments array
            await Task.findByIdAndUpdate(comment.task, {
                $pull: { comments: comment._id }
            });

            // If this is a reply, remove from parent's replies array
            if (comment.parentComment) {
                await Comment.findByIdAndUpdate(comment.parentComment, {
                    $pull: { replies: comment._id }
                });
            }

            // Remove all replies if this is a parent comment
            if (comment.replies.length > 0) {
                await Comment.deleteMany({ _id: { $in: comment.replies } });
            }

            await comment.remove();
            res.json({ message: 'Comment deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Add attachment to comment
    addAttachment: async (req, res) => {
        try {
            const { name, url, type } = req.body;
            const comment = await Comment.findById(req.params.commentId);

            if (!comment) {
                return res.status(404).json({ message: 'Comment not found' });
            }

            if (comment.author.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to modify this comment' });
            }

            comment.attachments.push({
                name,
                url,
                type,
                uploadedAt: new Date()
            });

            const updatedComment = await comment.save();
            res.json(updatedComment);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

module.exports = commentController; 