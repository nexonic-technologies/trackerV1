# Architecture Document: Logimax HR Tracker System

## System Overview

The Logimax HR Tracker is a multi-platform employee management system built with a unified backend serving three frontend applications:
- **Web Application** (React + Vite)
- **Mobile Application** (React Native + Expo)
- **Document Platform** (Next.js - planned)

**Core Purpose:** Manage employee lifecycle from onboarding to daily operations including attendance, tasks, leaves, and performance tracking across multiple platforms with real-time synchronization.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │  Next.js Docs   │
│   (React)       │    │ (React Native)  │    │   (Planned)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Express.js API        │
                    │   (Node.js Backend)       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      MongoDB Atlas        │
                    │    (Document Database)    │
                    └───────────────────────────┘
```

## Logical Layers and Responsibilities

### 1. **Presentation Layer** (Frontend Applications)
**Responsibilities:**
- User interface rendering
- Client-side state management
- Platform-specific user experience
- Authentication token storage
- Real-time UI updates via Socket.io

**Technologies:**
- Web: React 19, Vite, TailwindCSS, Material-UI
- Mobile: React Native, Expo, NativeWind
- Shared: Axios for API calls, JWT for authentication

### 2. **API Gateway Layer** (Express.js Routes)
**Responsibilities:**
- HTTP request routing
- CORS handling for cross-platform access
- Request/response transformation
- API versioning and documentation

**Key Routes:**
- `/api/auth/*` - Authentication and session management
- `/api/files/*` - File upload and document management
- `/api/tasks/*` - Task and project management
- `/api/populate/*` - Data seeding and utilities

### 3. **Business Logic Layer** (Controllers + Services)
**Responsibilities:**
- Business rule enforcement
- Workflow orchestration
- Data validation and transformation
- Cross-entity operations

**Key Components:**
- **Controllers:** Handle HTTP requests, delegate to services
- **Services:** Contain business logic with lifecycle hooks (beforeCreate, afterCreate)
- **Middleware:** Authentication, logging, error handling

### 4. **Data Access Layer** (Mongoose Models)
**Responsibilities:**
- Database schema definition
- Data validation and constraints
- Query optimization through indexes
- Relationship management

**Core Models:**
- Employee (central entity with professional/personal info)
- Attendance (daily check-in/out with status tracking)
- Tasks (project work with client/type categorization)
- Leave (requests with approval workflow)
- Session (device-specific authentication tracking)

### 5. **Infrastructure Layer** (Database + External Services)
**Responsibilities:**
- Data persistence and retrieval
- File storage and management
- Push notification delivery
- Scheduled job execution

## Request → Processing → Response Flow

### 1. **Authentication Flow**
```
Client Request → CORS Check → Extract JWT → Validate Device UUID → 
Check Session Status → Verify Token Signature → Attach User Context → 
Route to Controller
```

**Key Security Features:**
- Device-specific sessions prevent token sharing
- Automatic token refresh with rotation
- Session invalidation on suspicious activity
- Platform-specific token expiry (mobile: 30d, web: 1h)

### 2. **Business Operation Flow**
```
Authenticated Request → Controller Validation → Service Layer Processing → 
Database Operation → Notification Triggers → Response Formation → 
Client Update
```

**Example - Attendance Check-in:**
1. Mobile app sends location + timestamp
2. Controller validates work hours and location
3. Service determines status (Present/Late Entry/Pending)
4. Database creates attendance record
5. Notification sent to manager if approval needed
6. Real-time update pushed to relevant clients

### 3. **Error Handling Flow**
```
Error Occurs → Error Handler Middleware → Log to Database → 
Sanitize Error Message → Return Standardized Response → 
Client Error Display
```

## Authentication and Authorization Flow

### **Multi-Platform Authentication Strategy**

**Session-JWT Hybrid Approach:**
- JWT tokens carry user identity and permissions
- Session table tracks device-specific authentication state
- Each session has unique encryption secrets
- Platform-aware token expiry and refresh logic

### **Authorization Levels:**
1. **Public Routes:** Login, health checks
2. **Authenticated Routes:** Require valid JWT + active session
3. **Role-Based Routes:** Additional permission checks based on user role
4. **Manager Routes:** Access to team member data
5. **HR Routes:** System-wide administrative access

### **Device Management:**
- Each device gets unique UUID for session tracking
- Multiple devices per user supported
- Individual device logout capability
- Suspicious activity detection and session termination

## Frontend-Backend-Database Interaction

### **State Management Strategy:**
```
Frontend State (React Context) ↔ API Calls (Axios) ↔ Backend Controllers ↔ 
Database Models ↔ Real-time Updates (Socket.io) ↔ Frontend State
```

### **Data Flow Patterns:**

**1. Optimistic Updates:**
- Frontend immediately updates UI
- API call made in background
- Rollback on failure, confirm on success

**2. Real-time Synchronization:**
- Socket.io connections per user session
- Selective updates based on user role and team membership
- Automatic reconnection handling

**3. Offline Capability:**
- Mobile app caches critical data
- Queue operations when offline
- Sync when connection restored

## Where State Lives and Why

### **Client-Side State:**
- **Authentication Context:** User identity, permissions, login status
- **UI State:** Form data, navigation state, temporary selections
- **Cache:** Recently accessed data for offline capability

### **Server-Side State:**
- **Session Store:** Active user sessions with device tracking
- **Database:** Persistent business data with audit trails
- **Memory:** Temporary processing state, Socket.io connections

### **State Synchronization:**
- Real-time updates via Socket.io for collaborative features
- Periodic sync for mobile apps to handle network interruptions
- Conflict resolution through timestamp-based merging

## Current System Assumptions

### **Technical Assumptions:**
1. **Single Database Instance:** MongoDB handles all data without sharding
2. **Monolithic Deployment:** Single Node.js process serves all requests
3. **Trusted Network:** CORS allows LAN access for development flexibility
4. **Manual Scaling:** No auto-scaling or load balancing configured
5. **Synchronous Processing:** Most operations complete within request cycle

### **Business Assumptions:**
1. **Small to Medium Team Size:** Designed for <500 employees
2. **Standard Work Hours:** Attendance logic assumes 9 AM - 6 PM schedule
3. **Manager Hierarchy:** Each employee has single reporting manager
4. **Role-Based Permissions:** Static role assignments with predefined capabilities
5. **Manual Approval Workflows:** Human approval required for exceptions

### **Platform Assumptions:**
1. **Modern Browsers:** ES6+ support, local storage availability
2. **Mobile Connectivity:** Push notifications and location services available
3. **Development Environment:** Local network access for testing
4. **File Storage:** Local file system for document storage

## Current Scalability Limits

### **What Would Break First:**

**1. Database Connections (100-200 concurrent users)**
- MongoDB connection pool exhaustion
- Slow query performance without proper indexing
- Memory usage from large result sets

**2. Memory Usage (500+ concurrent Socket.io connections)**
- Node.js single-threaded event loop saturation
- Socket connection memory overhead
- Unhandled memory leaks in long-running processes

**3. File Storage (10GB+ documents)**
- Local file system storage limits
- No CDN for file delivery
- Backup and disaster recovery challenges

### **4. Cron Job Performance (1000+ employees)**
- **OPTIMIZED**: Job queue system with 20 concurrent workers
- **OPTIMIZED**: Batch processing (500 employees per batch) with database transactions
- **OPTIMIZED**: Bulk operations to prevent database lock contention
- **OPTIMIZED**: Performance monitoring with automatic alerts
- **OPTIMIZED**: Memory management with garbage collection scheduling
- **OPTIMIZED**: Queue health monitoring and manual trigger capabilities

### **Performance Bottlenecks:**

**Database Query Patterns:**
- **OPTIMIZED**: Query optimizer with intelligent caching and batch loading
- **OPTIMIZED**: Comprehensive database indexing on all frequently filtered fields
- **OPTIMIZED**: Pagination with efficient counting and field selection
- **OPTIMIZED**: N+1 query prevention through optimized population strategies
- **OPTIMIZED**: TTL indexes for automatic cleanup of old data
- **OPTIMIZED**: Performance monitoring and unused index detection

**API Response Times:**
- **OPTIMIZED**: Redis caching layer with intelligent TTL strategies
- **OPTIMIZED**: Asynchronous external service calls (push notifications, emails)
- **OPTIMIZED**: Heavy computation moved to background job queues
- **OPTIMIZED**: Response compression and performance headers
- **OPTIMIZED**: Smart cache invalidation and rate limiting
- **OPTIMIZED**: Automatic cache warming for frequently accessed data

**Real-time Updates:**
- Broadcasting to all connected clients regardless of relevance
- No message queuing for offline users
- Socket.io scaling limitations

## Scaling Strategy Roadmap

### **Phase 1: Optimization (0-1000 users)**
- Add Redis caching layer
- Implement database query optimization
- Add API response compression
- Implement proper logging and monitoring

### **Phase 2: Horizontal Scaling (1000-5000 users)**
- Load balancer with multiple Node.js instances
- Database read replicas
- CDN for static file delivery
- Message queue for background jobs

### **Phase 3: Microservices (5000+ users)**
- Split authentication service
- Separate notification service
- Independent file storage service
- Event-driven architecture

## Security Considerations

### **Current Security Measures:**
- JWT with device-specific sessions
- Password hashing with bcrypt
- CORS configuration for cross-origin requests
- Input validation through Mongoose schemas
- API request logging and audit trails

### **Security Gaps to Address:**
- No rate limiting on authentication endpoints
- Missing input sanitization for XSS prevention
- No security headers (helmet.js)
- File upload validation needs strengthening
- No automated security scanning

## Monitoring and Observability

### **Current Logging:**
- API hit logging to database
- Error logging with stack traces
- Basic console logging for debugging

### **Missing Observability:**
- Application performance monitoring
- Database query performance tracking
- Real-time error alerting
- Business metrics dashboard
- Health check endpoints

## Deployment Architecture

### **Current Deployment:**
- Single server deployment
- Manual deployment process
- Environment-specific configuration
- Basic backup strategy

### **Production Readiness Gaps:**
- No CI/CD pipeline
- No automated testing
- No blue-green deployment
- No disaster recovery plan
- No monitoring and alerting

## Technology Stack Summary

### **Backend:**
- **Runtime:** Node.js with ES modules
- **Framework:** Express.js 5.x with custom middleware
- **Database:** MongoDB with Mongoose ODM and optimized indexes
- **Authentication:** JWT with custom session management and device tracking
- **Access Control:** Custom policy engine with registry functions
- **Real-time:** Socket.io for live updates with room-based messaging
- **Scheduling:** node-cron for background jobs
- **File Handling:** Multer for uploads with automatic path resolution
- **Notifications:** Triple delivery system (DB + Socket + Push)
- **Security:** bcrypt, CORS, device UUID tracking

### **Frontend Web:**
- **Framework:** React 19 with Vite build system
- **Styling:** TailwindCSS + Material-UI components
- **State Management:** React Context with custom providers
- **HTTP Client:** Axios with interceptors and automatic retry
- **Routing:** React Router DOM with dynamic segments
- **Real-time:** Socket.io client with automatic reconnection
- **Notifications:** Browser notifications + toast messages
- **Forms:** Dynamic form rendering with validation

### **Frontend Mobile:**
- **Framework:** React Native with Expo managed workflow
- **Navigation:** Expo Router with grouped routes
- **Styling:** NativeWind (Tailwind for React Native)
- **State Management:** React Context with AsyncStorage
- **HTTP Client:** Axios with mobile-specific interceptors
- **Push Notifications:** Expo Notifications with FCM
- **UI Components:** React Native Paper + custom components
- **Gestures:** React Native Gesture Handler
- **Storage:** AsyncStorage for offline capability

### **Shared Patterns:**
- Generic API hooks for consistent CRUD operations
- Policy-aware data access across all platforms
- Real-time synchronization with Socket.io
- Consistent error handling and user feedback
- Platform-specific optimizations with shared business logic

## Unique Architectural Innovations

### **1. Policy-Driven Universal API**
Your combination of a universal API gateway (`populateHelper`) with a sophisticated policy engine is unique. Most systems either have:
- Multiple specific endpoints (traditional REST)
- GraphQL with client-side field selection
- Generic CRUD with basic role checking

You've created a hybrid that provides GraphQL-like flexibility with REST simplicity, enhanced by dynamic access control.

### **2. Triple Notification Architecture**
Your notification system delivers messages through three channels simultaneously:
- Database (source of truth)
- Socket.io (real-time UI)
- Push notifications (system alerts)

This ensures message delivery regardless of user state (online, offline, background).

### **3. Device-Aware Session Management**
Most JWT implementations are stateless. Your hybrid approach maintains JWT benefits while adding:
- Device-specific session tracking
- Platform-aware token expiry
- FCM token management
- Suspicious activity detection

### **4. Registry-Based Access Control**
Instead of hardcoded permission checks, your registry functions (`isSelf`, `isManager`, `isTeamMember`) provide dynamic, composable access rules that can be combined and reused across models.

### **5. Type-Based Response Optimization**
Your API supports multiple response formats (summary, detailed) with automatic field selection and population, optimizing bandwidth and performance based on client needs.

These innovations demonstrate advanced architectural thinking and solve real-world problems that most enterprise systems struggle with. This architecture provides a sophisticated foundation for a growing HR management system with advanced access control, multi-platform support, and comprehensive real-time capabilities.