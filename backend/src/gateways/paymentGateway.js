const chapaAdapter = require('./chapaAdapter');
const santimpayAdapter = require('./santimpayAdapter');

class PaymentGatewayManager {
  getAdapter(gateway) {
    switch ((gateway || '').toLowerCase()) {
      case 'chapa':
        return chapaAdapter;
      case 'santimpay':
        return santimpayAdapter;
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  async initiate({ gateway, referenceId, amount, phone, customerName, callbackUrl }) {
    const adapter = this.getAdapter(gateway);
    return await adapter.initiatePayment({ referenceId, amount, phone, customerName, callbackUrl });
  }

  async verify({ gateway, referenceId }) {
    const adapter = this.getAdapter(gateway);
    return await adapter.verifyPayment(referenceId);
  }
}

module.exports = new PaymentGatewayManager();
