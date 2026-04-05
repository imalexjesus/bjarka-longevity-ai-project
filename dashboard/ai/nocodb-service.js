/**
 * NocoDB Integration Service
 * Handles syncing health logs and purchases with a NocoDB instance.
 */

export class NocoDBService {
    constructor() {
        this.baseUrl = localStorage.getItem('nocodb_base_url') || '';
        this.apiToken = localStorage.getItem('nocodb_token') || '';
        this.projectId = localStorage.getItem('nocodb_project_id') || '';
        this.tableLogs = localStorage.getItem('nocodb_table_logs') || 'logs';
        this.tablePurchases = localStorage.getItem('nocodb_table_purchases') || 'purchases';
    }

    isEnabled() {
        return !!(this.baseUrl && this.apiToken);
    }

    async testConnection() {
        if (!this.isEnabled()) return false;
        try {
            const res = await fetch(`${this.baseUrl}/api/v1/db/public/projects`, {
                headers: { 'xc-token': this.apiToken }
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    async syncLog(logEntry) {
        if (!this.isEnabled()) return;
        console.log("NocoDB: Syncing log entry...", logEntry);
        // await fetch(`${this.baseUrl}/api/v1/db/data/noco/${this.projectId}/${this.tableLogs}`, { ... });
    }

    async syncPurchase(purchaseEntry) {
        if (!this.isEnabled()) return;
        console.log("NocoDB: Syncing purchase entry...", purchaseEntry);
        // await fetch(`${this.baseUrl}/api/v1/db/data/noco/${this.projectId}/${this.tablePurchases}`, { ... });
    }

    async fetchAllLogs() {
        if (!this.isEnabled()) return null;
        // Logic for fetching from NocoDB to synchronize local state
    }

    configure(config) {
        localStorage.setItem('nocodb_base_url', config.baseUrl);
        localStorage.setItem('nocodb_token', config.apiToken);
        localStorage.setItem('nocodb_project_id', config.projectId);
        this.baseUrl = config.baseUrl;
        this.apiToken = config.apiToken;
        this.projectId = config.projectId;
    }
}

export const nocoService = new NocoDBService();
