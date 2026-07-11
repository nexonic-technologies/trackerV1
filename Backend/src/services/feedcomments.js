export default function feedcommentsService() {
  return {
    // Ensure the author is set to the current user
    async afterCreate(ctx) {
      const { modelName, docId, userId } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');
        const { default: fcmService } = await import('./fcmService.js');
        const { generateNotification } = await import('../middlewares/notificationMessagePrasher.js');

        const commentDoc = await models.feedcomments.findById(docId)
          .populate('author', 'basicInfo.firstName basicInfo.lastName');

        if (!commentDoc || !commentDoc.postId) return;

        // Increment commentsCount on the feed post
        const post = await models.feedposts.findByIdAndUpdate(
          commentDoc.postId,
          { $inc: { commentsCount: 1 } },
          { new: true }
        );

        if (!post) return;

        const commenterName = `${commentDoc.author?.basicInfo?.firstName || ''} ${commentDoc.author?.basicInfo?.lastName || ''}`.trim() || 'Someone';

        const receivers = [];

        // Notify post author
        if (post.author.toString() !== userId.toString()) {
          receivers.push(post.author);
        }

        // Notify post followers
        if (post.followers && post.followers.length > 0) {
          receivers.push(...post.followers);
        }

        if (receivers.length > 0) {
          const commentMsg = generateNotification(commenterName, { type: 'comment' }, 'feedcomments');
          await fcmService.dispatchNotification({
            type: 'comment',
            title: 'New Comment',
            message: commentMsg,
            sender: userId,
            meta: { model: 'feedposts', modelId: post._id },
            receiversArray: receivers
          });
        }

      } catch (error) {
        console.error('feedcomments afterCreate error:', error);
      }
    },

    async afterDelete(ctx) {
      const { doc, userId } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');

        if (doc && doc.postId) {
          await models.feedposts.findByIdAndUpdate(
            doc.postId,
            { $inc: { commentsCount: -1 } }
          );
        }
      } catch (error) {
        console.error('feedcomments afterDelete error:', error);
      }
    }
  };
}
