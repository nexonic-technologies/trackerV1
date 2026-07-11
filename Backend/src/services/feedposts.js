export default function feedpostsService() {
  return {
    /**
     * beforeCreate: Set the author and default values before saving a new post.
     */
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      body.author = userId;
      body.commentsCount = 0;
      body.viewsCount = 0;
      body.viewedBy = [];
      body.reactions = [];
    },

    /**
     * afterCreate: Send push notifications to mentioned users and group/channel members.
     */
    async afterCreate(ctx) {
      const { modelName, docId, userId } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');
        const { default: fcmService } = await import('./fcmService.js');
        const { generateNotification } = await import('../middlewares/notificationMessagePrasher.js');

        const postDoc = await models.feedposts.findById(docId)
          .populate('author', 'basicInfo.firstName basicInfo.lastName');

        if (!postDoc) return;

        const authorName = `${postDoc.author?.basicInfo?.firstName || ''} ${postDoc.author?.basicInfo?.lastName || ''}`.trim() || 'Someone';

        // 1. Notify Mentions
        if (postDoc.mentions && postDoc.mentions.length > 0) {
          const mentionMsg = generateNotification(authorName, { type: 'mention' }, 'feedposts');
          await fcmService.dispatchNotification({
            type: 'mention',
            title: 'New Mention',
            message: mentionMsg,
            sender: userId,
            meta: { model: 'feedposts', modelId: docId },
            receiversArray: postDoc.mentions
          });
        }

        // 2. Notify Group or Channel Members
        let receivers = [];
        if (postDoc.group) {
          console.log('[DEBUG-FEEDPOSTS] Post in group:', postDoc.group);
          const group = await models.feedgroups.findById(postDoc.group).select('members.employee name').lean();
          if (group && group.members) {
            console.log('[DEBUG-FEEDPOSTS] Group members:', group.members);
            receivers.push(...group.members.map(m => m.employee));
            const groupName = group.name || 'a group';
            const postMsg = generateNotification(authorName, { type: 'group_post', groupName }, 'feedposts');
            console.log('[DEBUG-FEEDPOSTS] Dispatching to group receivers:', receivers);
            await fcmService.dispatchNotification({
              type: 'post',
              title: `New Post in ${groupName}`,
              message: postMsg,
              sender: userId,
              meta: { model: 'feedposts', modelId: docId },
              receiversArray: receivers
            });
          }
        } else if (postDoc.channel) {
          console.log('[DEBUG-FEEDPOSTS] Post in channel:', postDoc.channel);
          const channel = await models.feedchannels.findById(postDoc.channel).select('members.employee name groups').lean();
          if (channel) {
            console.log('[DEBUG-FEEDPOSTS] Channel members:', channel.members);
            if (channel.members) receivers.push(...channel.members.map(m => m.employee));
            
            // Channel also includes members of associated groups
            if (channel.groups && channel.groups.length > 0) {
              const groups = await models.feedgroups.find({ _id: { $in: channel.groups } }).select('members.employee').lean();
              groups.forEach(g => {
                if (g.members) receivers.push(...g.members.map(m => m.employee));
              });
            }

            const channelName = channel.name || 'a channel';
            const channelMsg = generateNotification(authorName, { type: 'channel_post', channelName }, 'feedposts');
            console.log('[DEBUG-FEEDPOSTS] Dispatching to channel receivers:', receivers);
            await fcmService.dispatchNotification({
              type: 'post',
              title: `New Post in ${channelName}`,
              message: channelMsg,
              sender: userId,
              meta: { model: 'feedposts', modelId: docId },
              receiversArray: receivers
            });
          }
        }
      } catch (error) {
        console.error('[DEBUG-FEEDPOSTS] feedposts afterCreate error:', error);
      }
    },

    /**
     * afterUpdate: Notify author on new reactions
     */
    async afterUpdate(ctx) {
      const { docId, userId, data, beforeDoc } = ctx;
      try {
        const { default: fcmService } = await import('./fcmService.js');
        const { default: models } = await import('../models/Collection.js');
        const { generateNotification } = await import('../middlewares/notificationMessagePrasher.js');

        // Check if a reaction was added
        const oldReactionsCount = beforeDoc?.reactions?.length || 0;
        const newReactionsCount = data?.reactions?.length || 0;

        if (newReactionsCount > oldReactionsCount && data.author.toString() !== userId.toString()) {
          const reactor = await models.employees.findById(userId).select('basicInfo.firstName basicInfo.lastName').lean();
          const reactorName = `${reactor?.basicInfo?.firstName || ''} ${reactor?.basicInfo?.lastName || ''}`.trim() || 'Someone';
          
          const reactionMsg = generateNotification(reactorName, { type: 'reaction' }, 'feedposts');
          await fcmService.dispatchNotification({
            type: 'reaction',
            title: 'New Reaction',
            message: reactionMsg,
            sender: userId,
            meta: { model: 'feedposts', modelId: docId },
            receiversArray: [data.author]
          });
        }
      } catch (error) {
        console.error('feedposts afterUpdate error:', error);
      }
    },

    /**
     * beforeRead: Filter posts to only those visible to the requesting user.
     * A user can see:
     *  - Posts in groups they're a member of
     *  - Posts in channels they're a member of (directly or via group)
     *  - Posts they authored
     *  - Posts they were mentioned in
     *  - General posts (no group or channel)
     */
    async beforeRead({ role, userId, filter }) {
      const { default: models } = await import('../models/Collection.js');
      const { default: mongoose } = await import('mongoose');

      // Safely convert userId to ObjectId
      let userObjectId;
      try {
        userObjectId = new mongoose.Types.ObjectId(userId.toString());
      } catch {
        return; // Invalid userId, skip filter injection
      }

      // Find groups the user is a member of
      const userGroups = await models.feedgroups.find({ 'members.employee': userObjectId }).select('_id').lean();
      const userGroupIds = userGroups.map(g => g._id);

      // Find channels the user is a member of (directly or via a group they're in)
      const userChannels = await models.feedchannels.find({
        $or: [
          { 'members.employee': userObjectId },
          { groups: { $in: userGroupIds } }
        ]
      }).select('_id').lean();
      const userChannelIds = userChannels.map(c => c._id);

      const visibilityFilter = {
        $or: [
          { group: { $in: userGroupIds } },
          { channel: { $in: userChannelIds } },
          { author: userObjectId },
          { mentions: userObjectId },
          // General posts: no group AND no channel (null, undefined, or missing)
          {
            $and: [
              { $or: [{ group: { $exists: false } }, { group: null }] },
              { $or: [{ channel: { $exists: false } }, { channel: null }] }
            ]
          }
        ]
      };

      let newFilter = filter || {};
      if (Object.keys(newFilter).length > 0) {
        newFilter = { $and: [newFilter, visibilityFilter] };
      } else {
        newFilter = visibilityFilter;
      }

      return { filter: newFilter };
    },

    /**
     * beforeUpdate: Block direct manipulation of comment counts.
     */
    async beforeUpdate(ctx) {
      const { body, docId, userId } = ctx;
      if (body.commentsCount !== undefined) delete body.commentsCount;
    }
  };
}
