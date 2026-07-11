import jwt from 'jsonwebtoken';
import AgentToken from '../models/AgentToken.js';

export const agentAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const source = req.headers['x-source'];
    
    // Skip auth for external login endpoint
    if (source === 'external' && req.path === '/api/agent/login' && req.method === 'POST') {
      return next();
    }
    
    // Skip auth for external requests without token
    if (source === 'external' && !token) {
      return next();
    }
    
    if (source === 'external' && token) {
      // External agent authentication - handle both AgentToken and Agent JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // First try AgentToken model
        let agent = await AgentToken.findOne({
          currentSessionToken: token,
          sessionExpiresAt: { $gt: new Date() },
          isActive: true
        });
        
        if (agent) {
          req.agent = {
            agentId: agent.agentId,
            clientId: agent.clientId,
            isExternal: true
          };
          return next();
        }
        
        // Fallback to Agent model for JWT tokens
        const Agent = (await import('../models/Agent.js')).default;
        agent = await Agent.findById(decoded.id).populate('client');
        
        if (agent && agent.isActive) {
          req.agent = {
            agentId: agent._id,
            clientId: agent.client._id,
            isExternal: true,
            email: agent.email,
            name: agent.name
          };
          req.user = {
            _id: agent._id,
            email: agent.email,
            name: agent.name,
            role: 'agent' || 'admin',
            client: agent.client._id
          };
          
          // Auto-set clientId and createdBy for external agent requests
          if (req.body && typeof req.body === 'object') {
            req.body.clientId = agent.client._id;
            req.body.createdBy = agent._id;
            req.body.createdByModel = 'agents';
          }
          
          return next();
        }
        
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        
      } catch (jwtError) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }
    
    // Fall back to regular authentication for internal users
    next();
    
  } catch (error) {
    if (req.headers['x-source'] === 'external') {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
    next();
  }
};