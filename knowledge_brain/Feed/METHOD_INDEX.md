# Method & Model Index: Feed

## Models (Alphabetical)
| Model | Mongoose Name | Source File |
|---|---|---|
| **FeedChannel** | `feedchannels` | `FeedChannel.js` |
| **FeedComment** | `feedcomments` | `FeedComment.js` |
| **FeedGroup** | `feedgroups` | `FeedGroup.js` |
| **FeedPost** | `feedposts` | `FeedPost.js` |

## Service Hooks & Helper Functions
| Function Name | File | Description |
|---|---|---|
| **beforeCreate** | `services/feedposts.js` | Author mapping and defaults initialization |
| **afterCreate** | `services/feedposts.js` | Notification broadcaster (Mentions & Groups/Channels) |
| **afterUpdate** | `services/feedposts.js` | Reaction alert triggers |
| **beforeRead** | `services/feedposts.js` | Security/visibility scopes filter |
| **beforeUpdate** | `services/feedposts.js` | Blocks client-side modifications on stats |
| **afterCreate** | `services/feedcomments.js` | Increments comment count & notifies author/followers |
| **afterDelete** | `services/feedcomments.js` | Decrements comment count on post |
