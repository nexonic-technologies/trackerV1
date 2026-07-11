# Cross Module Map: Feed

## Outbound References (Mongoose Schema relations)
| Target Collection | Source Collection | Reference Field | Purpose |
|---|---|---|---|
| **employees** | `feedposts` | `author` | Creator of the post |
| **employees** | `feedposts` | `mentions` | Tagged users notified |
| **employees** | `feedposts` | `pinnedBy` | List of employees who pinned the post |
| **employees** | `feedposts` | `bookmarkedBy` | List of employees who bookmarked the post |
| **employees** | `feedposts` | `followers` | Users watching for comment notifications |
| **employees** | `feedposts` | `reactions.employee` | User who reacted to the post |
| **employees** | `feedposts` | `viewedBy.employee` | User who viewed the post |
| **employees** | `feedcomments` | `author` | Creator of the comment |
| **employees** | `feedcomments` | `mentions` | Tagged users in comments |
| **employees** | `feedcomments` | `reactions.employee` | User who reacted to the comment |
| **employees** | `feedcomments` | `replies.author` | Creator of nested comment reply |
| **employees** | `feedcomments` | `replies.mentions` | Tagged users in reply |
| **employees** | `feedgroups` | `members.employee` | Enrolled member of the group |
| **employees** | `feedgroups` | `createdBy` | Owner of the group |
| **employees** | `feedchannels` | `members.employee` | Enrolled member of the channel |
| **employees** | `feedchannels` | `createdBy` | Owner of the channel |
| **feedgroups** | `feedposts` | `group` | Scope visibility filter |
| **feedgroups** | `feedchannels` | `groups` | Subscribed groups in channel |
| **feedchannels** | `feedposts` | `channel` | Scope visibility filter |
| **feedposts** | `feedcomments` | `postId` | Parent post connection |
