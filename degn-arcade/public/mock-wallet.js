/**
 * Mock Wallet for DEGN.gg Development
 * Simulates Phantom wallet functionality for testing
 */

class MockWallet {
    constructor() {
        this.isConnected = false;
        this.address = null;
        this.username = null;
        this.balance = 1.5; // Mock SOL balance
        
        this.loadFromStorage();
        this.setupUI();
    }
    
    loadFromStorage() {
        const stored = localStorage.getItem('degn_wallet');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.isConnected = data.isConnected || false;
                this.address = data.address || null;
                this.username = data.username || null;
                this.balance = data.balance || 1.5;
            } catch (e) {
                console.error('Failed to load wallet from storage:', e);
            }
        }
    }
    
    saveToStorage() {
        const data = {
            isConnected: this.isConnected,
            address: this.address,
            username: this.username,
            balance: this.balance
        };
        localStorage.setItem('degn_wallet', JSON.stringify(data));
    }
    
    generateMockAddress() {
        // Generate a realistic-looking Solana address
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
        let address = '';
        for (let i = 0; i < 44; i++) {
            address += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return address;
    }
    
    async connect() {
        return new Promise((resolve) => {
            // Simulate connection delay
            setTimeout(() => {
                if (!this.address) {
                    this.address = this.generateMockAddress();
                    this.username = `Player${this.address.slice(-4)}`;
                }
                
                this.isConnected = true;
                this.saveToStorage();
                this.updateUI();
                
                resolve({
                    address: this.address,
                    username: this.username,
                    balance: this.balance
                });
            }, 500);
        });
    }
    
    async disconnect() {
        this.isConnected = false;
        this.saveToStorage();
        this.updateUI();
    }
    
    async getBalance() {
        return this.balance;
    }
    
    async signTransaction(transaction) {
        // Mock transaction signing
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    signature: 'mock_signature_' + Date.now(),
                    transaction: transaction
                });
            }, 1000);
        });
    }
    
    setupUI() {
        // Create wallet UI overlay
        const overlay = document.createElement('div');
        overlay.id = 'mock-wallet-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #8b5cf6;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            min-width: 200px;
        `;
        
        overlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #8b5cf6;">
                🦄 Mock Wallet (Dev Only)
            </div>
            <div id="wallet-status">Disconnected</div>
            <div id="wallet-address" style="margin: 5px 0; font-size: 10px; color: #888;"></div>
            <div id="wallet-balance" style="margin: 5px 0;"></div>
            <button id="wallet-connect-btn" style="
                background: #8b5cf6;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
                width: 100%;
            ">Connect</button>
            <div style="margin-top: 10px; font-size: 10px; color: #666;">
                This is a development mock wallet.<br>
                TODO: Replace with real Phantom integration.
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Setup button handler
        document.getElementById('wallet-connect-btn').addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });
        
        this.updateUI();
    }
    
    updateUI() {
        const statusEl = document.getElementById('wallet-status');
        const addressEl = document.getElementById('wallet-address');
        const balanceEl = document.getElementById('wallet-balance');
        const buttonEl = document.getElementById('wallet-connect-btn');
        
        if (this.isConnected) {
            statusEl.textContent = `Connected: ${this.username}`;
            statusEl.style.color = '#10b981';
            addressEl.textContent = `${this.address.slice(0, 4)}...${this.address.slice(-4)}`;
            balanceEl.textContent = `Balance: ${this.balance.toFixed(3)} SOL`;
            buttonEl.textContent = 'Disconnect';
            buttonEl.style.background = '#ef4444';
        } else {
            statusEl.textContent = 'Disconnected';
            statusEl.style.color = '#ef4444';
            addressEl.textContent = '';
            balanceEl.textContent = '';
            buttonEl.textContent = 'Connect';
            buttonEl.style.background = '#8b5cf6';
        }
    }
    
    // Public API for integration
    getWalletInfo() {
        return {
            isConnected: this.isConnected,
            address: this.address,
            username: this.username,
            balance: this.balance
        };
    }
}

// Initialize mock wallet when script loads
window.mockWallet = new MockWallet();

// Expose global functions for easy access
window.connectMockWallet = () => window.mockWallet.connect();
window.disconnectMockWallet = () => window.mockWallet.disconnect();
window.getMockWalletInfo = () => window.mockWallet.getWalletInfo();

console.log('🦄 Mock Wallet initialized. Use connectMockWallet() to connect.');
if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  console.log('TODO: Replace this with real Phantom wallet integration in production.');
}