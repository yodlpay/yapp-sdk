// This script manages the example app UI and interactions with the SDK

// Global SDK instance
let sdk = null;

// DOM Elements
const elements = {
  initSdkBtn: document.getElementById('init-sdk'),
  requestPaymentBtn: document.getElementById('request-payment'),
  getUserContextBtn: document.getElementById('get-user-context'),
  closeYappBtn: document.getElementById('close-yapp'),
  outputDiv: document.getElementById('output'),
  currencySelect: document.getElementById('currency'),
};

// Utility function to log output to the UI
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  const div = document.createElement('div');
  div.textContent = logMessage;

  if (type === 'success') {
    div.className = 'success';
  } else if (type === 'error') {
    div.className = 'error';
  }

  elements.outputDiv.appendChild(div);
  elements.outputDiv.scrollTop = elements.outputDiv.scrollHeight;
}

// Populate currency options from FiatCurrency enum
function populateCurrencyOptions() {
  const currencies = Object.values(YappSDK.FiatCurrency);
  const select = elements.currencySelect;

  // Clear existing options
  select.innerHTML = '';

  // Add options for each currency
  currencies.forEach((currency) => {
    const option = document.createElement('option');
    option.value = currency;
    option.textContent = currency;
    select.appendChild(option);
  });
}

// Initialize SDK with configuration
function initializeSdk() {
  try {
    const origin = document.getElementById('origin').value;
    const ensName = document.getElementById('ensName').value;

    if (!ensName) {
      throw new Error('ENS name is required');
    }

    const config = {
      origin: origin || undefined,
      ensName: ensName,
    };

    sdk = new YappSDK(config);
    log(
      `SDK initialized with origin=${origin} and ensName=${ensName}`,
      'success',
    );

    // Enable other buttons
    elements.requestPaymentBtn.disabled = false;
    elements.getUserContextBtn.disabled = false;
    elements.closeYappBtn.disabled = false;
  } catch (error) {
    log(`Failed to initialize SDK: ${error.message}`, 'error');
  }
}

// Request a payment
async function requestPayment() {
  if (!sdk) {
    log('SDK not initialized', 'error');
    return;
  }

  try {
    const address = document.getElementById('address').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const currency = document.getElementById('currency').value;
    const memo = document.getElementById('memo').value;
    const redirectUrl = document.getElementById('redirectUrl').value;

    if (!address) {
      throw new Error('Recipient address is required');
    }

    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const paymentConfig = {
      amount,
      currency,
      memo: memo || undefined,
      redirectUrl: redirectUrl || undefined,
    };

    log(`Requesting payment of ${amount} ${currency} to ${address}...`);

    const response = await sdk.requestPayment(address, paymentConfig);
    log(
      `Payment successful! Transaction: ${response.txHash} on chain ${response.chainId}`,
      'success',
    );
  } catch (error) {
    log(`Payment failed: ${error.message}`, 'error');
  }
}

// Get user context
async function getUserContext() {
  if (!sdk) {
    log('SDK not initialized', 'error');
    return;
  }

  try {
    log('Requesting user context...');

    const context = await sdk.getUserContext();
    log(`User context received:`, 'success');
    log(`Address: ${context.address}`);
    if (context.primaryEnsName) log(`Primary ENS: ${context.primaryEnsName}`);
    if (context.communityAddress)
      log(`Community Address: ${context.communityAddress}`);
    if (context.communityEnsName)
      log(`Community ENS: ${context.communityEnsName}`);
    if (context.communityUserEnsName)
      log(`Community User ENS: ${context.communityUserEnsName}`);
  } catch (error) {
    log(`Failed to get user context: ${error.message}`, 'error');
  }
}

// Close the Yapp iframe
function closeYapp() {
  if (!sdk) {
    log('SDK not initialized', 'error');
    return;
  }

  try {
    const origin = document.getElementById('origin').value;
    sdk.close(origin);
    log('Close message sent', 'success');
  } catch (error) {
    log(`Failed to close Yapp: ${error.message}`, 'error');
  }
}

// Check for payment response in URL (for redirect flow)
function checkPaymentResponse() {
  if (!sdk) return;

  const response = sdk.parsePaymentFromUrl();
  if (response) {
    log(
      `Found payment response in URL: txHash=${response.txHash}, chainId=${response.chainId}`,
      'success',
    );

    // Clean the URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Attach event listeners
function setupEventListeners() {
  elements.initSdkBtn.addEventListener('click', initializeSdk);
  elements.requestPaymentBtn.addEventListener('click', requestPayment);
  elements.getUserContextBtn.addEventListener('click', getUserContext);
  elements.closeYappBtn.addEventListener('click', closeYapp);

  // Disable buttons until SDK is initialized
  elements.requestPaymentBtn.disabled = true;
  elements.getUserContextBtn.disabled = true;
  elements.closeYappBtn.disabled = true;
}

// Initialize the app
function init() {
  // Expose YappSDK from global scope
  if (typeof YappSDK === 'undefined') {
    log(
      'YappSDK not loaded. Make sure the SDK is properly built and included.',
      'error',
    );
    return;
  }

  // Expose FiatCurrency for the UI
  if (YappSDK.FiatCurrency) {
    populateCurrencyOptions();
  }

  setupEventListeners();

  // Check for payment response in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('txHash') || urlParams.has('status')) {
    log('Payment response detected in URL, initializing SDK to parse it...');
    initializeSdk();
    checkPaymentResponse();
  }

  log('Example app initialized');
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
