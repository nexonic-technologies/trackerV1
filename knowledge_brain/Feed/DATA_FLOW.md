# Data Flow: Feed

## Dynamic API Payloads
Extracted from React pages targeting the generic `/populate` endpoint:

### 1. Feed Dashboard (`feed/index.jsx`)
- **Query Social Feed**: `POST /populate/read/feedposts`
  - Payload: `{ sort: { createdAt: -1 }, limit: 10, populateFields: [{ path: "author", select: "basicInfo" }] }`
  - *Note*: Automatically intercepted by `beforeRead` hook to filter visible posts.
- **Create New Post**: `POST /populate/create/feedposts`
  - Payload: `{ subject: "Subject Line", content: "<p>HTML Rich Content</p>", postType: "Update", group: null, channel: null, mentions: [] }`
- **React to Post**: `PUT /populate/update/feedposts/:id`
  - Payload: `{ $push: { reactions: { employee: "employee_id", reactionType: "love" } } }`

### 2. Post Details & Comments (`feedposts/[id].jsx`)
- **Load Post**: `POST /populate/read/feedposts/:id`
- **Query Comments**: `POST /populate/read/feedcomments`
  - Payload: `{ filter: { postId: "post_id" }, populateFields: [{ path: "author", select: "basicInfo" }] }`
- **Add Comment**: `POST /populate/create/feedcomments`
  - Payload: `{ postId: "post_id", content: "Comment text body", mentions: [] }`
- **Reply to Comment**: `PUT /populate/update/feedcomments/:commentId`
  - Payload: `{ $push: { replies: { author: "user_id", content: "Reply text", mentions: [] } } }`
- **Delete Comment**: `DELETE /populate/delete/feedcomments/:commentId`
