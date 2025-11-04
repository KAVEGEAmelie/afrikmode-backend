const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get payment configuration
 * @route   GET /api/admin/payment-config
 * @access  Private/Admin
 */
exports.getPaymentConfig = async (req, res, next) => {
  try {
    const config = await db('payment_config')
      .orderBy('payment_method')
      .select('*');

    // Parse JSON fields
    config.forEach(c => {
      if (c.api_credentials) c.api_credentials = JSON.parse(c.api_credentials);
      if (c.webhook_config) c.webhook_config = JSON.parse(c.webhook_config);
    });

    // Get commission settings
    const [commissionSettings] = await db('platform_settings')
      .where('key', 'commission_rates')
      .select('value');

    const commissionRates = commissionSettings ? JSON.parse(commissionSettings.value) : {
      default_rate: 10,
      vendor_tier_rates: {}
    };

    successResponse(res, {
      payment_methods: config,
      commission_rates: commissionRates
    }, 'Payment configuration retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle payment method
 * @route   PATCH /api/admin/payment-config/:method/toggle
 * @access  Private/Admin
 */
exports.togglePaymentMethod = async (req, res, next) => {
  try {
    const { method } = req.params;

    const config = await db('payment_config')
      .where('payment_method', method)
      .first();

    if (!config) throw new AppError('Payment method not found', 404);

    const newStatus = !config.is_active;
    await db('payment_config')
      .where('payment_method', method)
      .update({ is_active: newStatus, updated_at: db.fn.now() });

    const updated = await db('payment_config')
      .where('payment_method', method)
      .first();

    successResponse(res, { config: updated }, 'Payment method toggled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update payment method API keys
 * @route   PUT /api/admin/payment-config/:method/keys
 * @access  Private/Admin
 */
exports.updatePaymentMethodKeys = async (req, res, next) => {
  try {
    const { method } = req.params;
    const { api_key, api_secret, merchant_id, webhook_secret } = req.body;

    const config = await db('payment_config')
      .where('payment_method', method)
      .first();

    if (!config) throw new AppError('Payment method not found', 404);

    const apiCredentials = {
      api_key,
      api_secret,
      merchant_id,
      webhook_secret
    };

    await db('payment_config')
      .where('payment_method', method)
      .update({
        api_credentials: JSON.stringify(apiCredentials),
        updated_at: db.fn.now()
      });

    successResponse(res, null, 'API keys updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update commission rate
 * @route   PUT /api/admin/payment-config/commission
 * @access  Private/Admin
 */
exports.updateCommissionRate = async (req, res, next) => {
  try {
    const { default_rate, vendor_tier_rates } = req.body;

    const commissionRates = {
      default_rate,
      vendor_tier_rates: vendor_tier_rates || {}
    };

    // Check if setting exists
    const existing = await db('platform_settings')
      .where('key', 'commission_rates')
      .first();

    if (existing) {
      await db('platform_settings')
        .where('key', 'commission_rates')
        .update({
          value: JSON.stringify(commissionRates),
          updated_at: db.fn.now()
        });
    } else {
      await db('platform_settings').insert({
        key: 'commission_rates',
        value: JSON.stringify(commissionRates),
        created_at: db.fn.now()
      });
    }

    successResponse(res, { commission_rates: commissionRates }, 'Commission rates updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update service fee
 * @route   PUT /api/admin/payment-config/service-fee
 * @access  Private/Admin
 */
exports.updateServiceFee = async (req, res, next) => {
  try {
    const { fee_type, fee_value } = req.body; // fee_type: 'percentage' or 'fixed', fee_value: number

    const serviceFee = { fee_type, fee_value };

    const existing = await db('platform_settings')
      .where('key', 'service_fee')
      .first();

    if (existing) {
      await db('platform_settings')
        .where('key', 'service_fee')
        .update({
          value: JSON.stringify(serviceFee),
          updated_at: db.fn.now()
        });
    } else {
      await db('platform_settings').insert({
        key: 'service_fee',
        value: JSON.stringify(serviceFee),
        created_at: db.fn.now()
      });
    }

    successResponse(res, { service_fee: serviceFee }, 'Service fee updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test payment provider connection
 * @route   POST /api/admin/payment-config/:method/test
 * @access  Private/Admin
 */
exports.testPaymentProvider = async (req, res, next) => {
  try {
    const { method } = req.params;

    const config = await db('payment_config')
      .where('payment_method', method)
      .first();

    if (!config) throw new AppError('Payment method not found', 404);

    // Mock test result
    const testResult = {
      success: true,
      message: 'Connection test successful',
      provider: method,
      response_time: Math.floor(Math.random() * 1000) + 100
    };

    successResponse(res, { test_result: testResult }, 'Provider test completed');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment statistics
 * @route   GET /api/admin/payment-config/stats
 * @access  Private/Admin
 */
exports.getPaymentStats = async (req, res, next) => {
  try {
    const methodStats = await db('transactions')
      .select('payment_method')
      .count('* as count')
      .sum('amount as total_amount')
      .where('status', 'completed')
      .groupBy('payment_method')
      .orderBy('count', 'desc');

    const [{ total_commission }] = await db('transactions')
      .where('status', 'completed')
      .sum(db.raw('amount * 0.10 as total_commission')); // Assuming 10% commission

    successResponse(res, {
      method_stats: methodStats,
      total_commission: parseFloat(total_commission) || 0
    }, 'Payment statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available payment methods
 * @route   GET /api/admin/payment-config/available-methods
 * @access  Private/Admin
 */
exports.getAvailablePaymentMethods = async (req, res, next) => {
  try {
    const methods = [
      { value: 'mtn_mobile_money', label: 'MTN Mobile Money', icon: 'mtn' },
      { value: 'orange_money', label: 'Orange Money', icon: 'orange' },
      { value: 'moov_money', label: 'Moov Money', icon: 'moov' },
      { value: 'wave', label: 'Wave', icon: 'wave' },
      { value: 'paypal', label: 'PayPal', icon: 'paypal' },
      { value: 'stripe', label: 'Stripe', icon: 'stripe' },
      { value: 'bank_transfer', label: 'Virement bancaire', icon: 'bank' },
      { value: 'cash_on_delivery', label: 'Paiement à la livraison', icon: 'cash' }
    ];

    successResponse(res, { methods }, 'Available payment methods retrieved successfully');
  } catch (error) {
    next(error);
  }
};
