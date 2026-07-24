import axiosInstance from '@api/axiosInstance';
import { AuthApi } from '@api/auth.api';
import { PopulateApi } from '@api/populate.api';

export class AuthService {
  static async login(credentials) {
    const response = await axiosInstance.post(AuthApi.LOGIN, credentials);
    return response.data;
  }
  static async logout(headerConfig = {}) {
    const response = await axiosInstance.post(AuthApi.LOGOUT, {}, headerConfig);
    return response.data;
  }
  static async getContext() {
    const response = await axiosInstance.get(AuthApi.CONTEXT);
    return response.data;
  }
}

export class EmployeeService {
  static async getEmployees(options = {}) {
    const req = PopulateApi.READ('employees', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
}

export class PayrollService {
  static async getRuns(options = {}) {
    const req = PopulateApi.READ('payrollruns', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createRun(data) {
    const req = PopulateApi.CREATE('payrollruns', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateRun(id, data) {
    const req = PopulateApi.UPDATE('payrollruns', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async getStructures(options = {}) {
    const req = PopulateApi.READ('salarystructures', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createStructure(data) {
    const req = PopulateApi.CREATE('salarystructures', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getPayrolls(options = {}) {
    const req = PopulateApi.READ('payrolls', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getPeriodClosures(options = {}) {
    const req = PopulateApi.READ('periodclosures', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createPeriodClosure(data) {
    const req = PopulateApi.CREATE('periodclosures', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updatePeriodClosure(id, data) {
    const req = PopulateApi.UPDATE('periodclosures', id, data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
}

export class TaskService {
  static async getTasks(options = {}) {
    const req = PopulateApi.READ('tasks', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getTaskById(id) {
    const req = PopulateApi.READ('tasks', id);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createTask(data) {
    const req = PopulateApi.CREATE('tasks', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateTask(id, data) {
    const req = PopulateApi.UPDATE('tasks', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
  static async deleteTask(id) {
    const req = PopulateApi.DELETE('tasks', id);
    const response = await axiosInstance.delete(req.url);
    return response.data;
  }
}

export class TicketService {
  static async getTickets(options = {}) {
    const req = PopulateApi.READ('tickets', null, options);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async getTicketById(id) {
    const req = PopulateApi.READ('tickets', id);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async createTicket(data) {
    const req = PopulateApi.CREATE('tickets', data);
    const response = await axiosInstance.post(req.url, req.payload);
    return response.data;
  }
  static async updateTicket(id, data) {
    const req = PopulateApi.UPDATE('tickets', id, data);
    const response = await axiosInstance.put(req.url, req.payload);
    return response.data;
  }
}

export class MasterDataService {
  static async executePopulate(action, model, data = {}, id = null, options = {}) {
    if (action === 'read') {
      const req = PopulateApi.READ(model, id, { ...options, ...data });
      const response = await axiosInstance.post(req.url, req.payload);
      return response.data;
    } else if (action === 'create') {
      const req = PopulateApi.CREATE(model, data);
      const response = await axiosInstance.post(req.url, req.payload);
      return response.data;
    } else if (action === 'update') {
      const req = PopulateApi.UPDATE(model, id, data);
      const response = await axiosInstance.put(req.url, req.payload);
      return response.data;
    } else if (action === 'delete') {
      const req = PopulateApi.DELETE(model, id);
      const response = await axiosInstance.delete(req.url);
      return response.data;
    }
  }
}
