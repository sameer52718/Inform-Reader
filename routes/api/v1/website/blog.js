import { Router } from 'express';
import BlogController from '../../../../controllers/website/blogController.js';
import CommentController from '../../../../controllers/website/commentController.js';
import isUser from '../../../../middlewares/isUser.js';

const router = Router();

router.get('/', BlogController.get);
router.get('/:slug', BlogController.detail);

router.get('/:slug/comments', CommentController.getComments);
router.post('/:slug/comment', isUser, CommentController.createComment);
export default router;
