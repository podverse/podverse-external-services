import { config } from '@external-services/config';
const paypalRestSdk = require('paypal-rest-sdk');
const payments = paypalRestSdk.v1.payments;

export class PayPalService {
  private client: any;

  constructor() {
    this.client = new paypalRestSdk.core.PayPalHttpClient(this.getEnvironment());
  }

  private getEnvironment() {
    if (config.nodeEnv === 'production') {
      return new paypalRestSdk.core.LiveEnvironment(config.paypal.clientId, config.paypal.clientSecret);
    } else {
      return new paypalRestSdk.core.SandboxEnvironment(config.paypal.clientId, config.paypal.clientSecret);
    }
  }

  async getPaymentInfo(paymentId: string) {
    const request = new payments.PaymentGetRequest(paymentId);
    const response = await this.client.execute(request);
    return response.result;
  }

  async getCaptureInfo(paymentId: string) {
    const request = new payments.CaptureGetRequest(paymentId);
    const response = await this.client.execute(request);
    return response.result;
  }
}
